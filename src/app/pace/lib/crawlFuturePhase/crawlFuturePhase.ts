import {
  GroupContext,
  GroupPoolState,
  EmployeeTimelineEvent,
  ServCodeTimelineEvent,
  EngineEmployeeEntry,
} from "@/app/pace/PaceEngineTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { PresentPhaseState } from "@/app/pace/lib/crawlPresentPhase/crawlPresentPhase";
import { GroupProductionStats } from "@/app/pace/lib/crawlPastPhase/helpers/computeActualGroupRates";
import { drainGroupPool } from "./helpers/drainGroupPool";
import { recordEmployeeTimelineEvent, recordCrewTimelineEvent } from "./helpers/recordTimelineEvent";
import { resolveSequenceCascade } from "./helpers/resolveSequenceCascade";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

export type FuturePhaseState = {
  poolStates: Map<string, GroupPoolState>;
  servCodeToGroupId: Map<string, string>;
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
  crewTimelines: Map<string, ServCodeTimelineEvent[]>;
  /** Passed through from past phase for use in assembleGroupResults. */
  groupProductionStats: Map<string, GroupProductionStats>;
};

const MAX_FUTURE_WEEKDAYS = 365;

/**
 * Phase 3: Drain pools by goalDailyPrice; record projectedEndDate + timelines.
 *
 * Walks forward one weekday at a time from mainDate + 1.
 * On each day, each employee works their highest-priority eligible group
 * (priority = order in their groupAssignments list).
 *
 * Rules:
 * - Groups with missing goals (null goalDailyPrice) are skipped — engine cannot project them.
 * - Sequence-locked groups are skipped until their predecessor cascades.
 * - Employee time-off dates (PTO + holidays) are skipped.
 * - Employee availability constraints (startDate/endDate) are enforced.
 * - When a group's pool hits zero, projectedEndDate is recorded.
 * - Timeline events are recorded at transition points (starts, finishes, switches, downtime).
 * - Pool history snapshots are appended for each future day.
 */
export function crawlFuturePhase(
  inputs: PaceEngineInputs,
  groupContexts: GroupContext[],
  presentState: PresentPhaseState,
): FuturePhaseState {
  const { mainDate, sequences, cascadeThreshold, employees, holidayDates } = inputs;
  const { poolStates, servCodeToGroupId, groupProductionStats } = presentState;

  // Build employee entries with time-off sets
  const employeeEntries: EngineEmployeeEntry[] = employees
    .filter((employee) => {
      // Only include employees assigned to at least one group context
      return groupContexts.some((ctx) => ctx.assignedEmployeeIds.includes(employee.employeeId));
    })
    .map((employee): EngineEmployeeEntry => {
      const timeOffDates = new Set<string>(holidayDates);
      for (const pto of employee.plannedTimeOff) {
        let day = pto.dateRange.min;
        while (day <= pto.dateRange.max) {
          if (dateStrings.isWeekDay(day)) timeOffDates.add(day);
          day = dateStrings.addDays(day, 1);
        }
      }
      return { employeeId: employee.employeeId, availability: employee.availability, timeOffDates };
    });

  // Build groupId → context map for O(1) lookups
  const contextByGroupId = new Map<string, GroupContext>();
  for (const ctx of groupContexts) {
    contextByGroupId.set(ctx.groupId, ctx);
  }

  // Build groupId → plannedEnd map for cascade checks (predecessor gate)
  const plannedEndByGroupId = new Map<string, string | null>();
  // Build groupId → plannedStart map for successor gate
  const plannedStartByGroupId = new Map<string, string | null>();
  for (const ctx of groupContexts) {
    plannedEndByGroupId.set(ctx.groupId, ctx.plannedEnd);
    plannedStartByGroupId.set(ctx.groupId, ctx.plannedStart);
  }

  // Initialize sequence locks — all successors (index > 0) start locked
  const lockedGroupIds = new Set<string>();
  for (const sequence of sequences) {
    for (let i = 1; i < sequence.groupIds.length; i++) {
      lockedGroupIds.add(sequence.groupIds[i]);
    }
  }

  // Pre-cascade: unlock any successors that should already be open before the crawl starts
  resolveSequenceCascade({
    sequences,
    poolStates,
    lockedGroupIds,
    groupScheduleMap: plannedEndByGroupId,
    successorPlannedStartMap: plannedStartByGroupId,
    cascadeThreshold,
    day: mainDate,
  });

  // Initialize timeline tracking
  const employeeTimeline = new Map<string, { date: string; event: EmployeeTimelineEvent }[]>();
  const crewTimelines = new Map<string, ServCodeTimelineEvent[]>();
  const lastWorkedGroupByEmployee = new Map<string, string | null>();
  const inDowntimeByEmployee = new Map<string, boolean>();
  const activeEmployeesByGroup = new Map<string, Set<string>>();

  for (const entry of employeeEntries) {
    employeeTimeline.set(entry.employeeId, []);
    lastWorkedGroupByEmployee.set(entry.employeeId, null);
    inDowntimeByEmployee.set(entry.employeeId, false);
  }

  // Build set of groupIds that are the last in their sequence (or standalone).
  // Only these groups can become stragglers — non-last groups have remaining pool
  // carried forward by the cascade mechanism.
  const lastInSequenceGroupIds = new Set<string>();
  const sequenceGroupIdSets = new Set(sequences.flatMap((s) => s.groupIds));
  for (const ctx of groupContexts) {
    if (!sequenceGroupIdSets.has(ctx.groupId)) {
      // Standalone group — not in any sequence
      lastInSequenceGroupIds.add(ctx.groupId);
    }
  }
  for (const sequence of sequences) {
    const lastGroupId = sequence.groupIds.at(-1);
    if (lastGroupId) lastInSequenceGroupIds.add(lastGroupId);
  }

  // Walk forward day by day
  let day = dateStrings.nextWeekdayAfter(mainDate);
  const maxDay = dateStrings.addWeekdays(mainDate, MAX_FUTURE_WEEKDAYS);

  while (day <= maxDay) {
    // Check if any pool remains that is not a straggler.
    // A straggler is a STANDALONE group (not in any sequence) that is past its plannedEnd
    // and past the cascade threshold — the team has moved on; stop projecting it.
    // Sequence members (first, middle, or last) are never stragglers — they always drain
    // to zero or cascade their remainder forward to the next group.
    let anyRemaining = false;
    const activeGroupIds = new Set<string>();
    for (const [groupId, state] of poolStates) {
      if (state.poolRemaining <= 0) continue;
      // Locked groups have no active work — exclude from snapshots
      if (lockedGroupIds.has(groupId)) continue;

      const plannedEnd = plannedEndByGroupId.get(groupId) ?? null;
      const isInSequence = sequenceGroupIdSets.has(groupId);
      const isStraggler =
        !isInSequence &&
        plannedEnd !== null &&
        day > plannedEnd &&
        state.totalPool > 0 &&
        state.completedSoFar / state.totalPool >= cascadeThreshold;

      if (!isStraggler) {
        anyRemaining = true;
        activeGroupIds.add(groupId);
      }
    }
    if (!anyRemaining) break;

    // Per-group daily stats for snapshot population (priceCompleted, priceForecasted, employeesWorking)
    const dailyGroupStats = new Map<string, { priceCompleted: number; priceForecasted: number; employeesWorking: string[] }>();

    // Check cascade unlocks at the start of each day
    resolveSequenceCascade({
      sequences,
      poolStates,
      lockedGroupIds,
      groupScheduleMap: plannedEndByGroupId,
      successorPlannedStartMap: plannedStartByGroupId,
      cascadeThreshold,
      day,
    });

    for (const entry of employeeEntries) {
      const { employeeId, availability, timeOffDates } = entry;

      // Skip time-off days
      if (timeOffDates.has(day)) {
        lastWorkedGroupByEmployee.set(employeeId, null);
        continue;
      }

      // Skip outside availability window
      if (availability.startDate && day < availability.startDate) continue;
      if (availability.endDate && day > availability.endDate) continue;

      const prevGroupId = lastWorkedGroupByEmployee.get(employeeId) ?? null;
      let workedGroupId: string | null = null;

      // Find the employee's assignment plan to get priority order
      const plan = inputs.assignmentsByEmployeeId.get(employeeId);
      if (!plan) continue;

      for (const { groupId } of plan.groupAssignments) {
        if (lockedGroupIds.has(groupId)) continue; // sequence-locked

        const poolState = poolStates.get(groupId);
        if (!poolState || poolState.poolRemaining <= 0) continue;

        const context = contextByGroupId.get(groupId);
        if (!context) continue;

        // Check if this group is open (plannedStart has been reached)
        if (context.plannedStart && day < context.plannedStart) continue;

        // Get this employee's goal for this group
        const goalRate = context.goalsByEmployee.get(employeeId) ?? null;
        if (goalRate === null || goalRate <= 0) continue; // missing goal — skip

        // Drain the pool
        const drained = drainGroupPool({ poolState, goalRate });

        if (drained <= 0) continue;

        workedGroupId = groupId;

        // Accumulate daily stats for this group's snapshot
        const existing = dailyGroupStats.get(groupId) ?? { priceCompleted: 0, priceForecasted: 0, employeesWorking: [] };
        dailyGroupStats.set(groupId, {
          priceCompleted: existing.priceCompleted + drained,
          priceForecasted: existing.priceForecasted + goalRate,
          employeesWorking: existing.employeesWorking.includes(employeeId)
            ? existing.employeesWorking
            : [...existing.employeesWorking, employeeId],
        });

        // Record projectedStartDate
        if (!poolState.projectedStartDate) {
          poolState.projectedStartDate = day;
        }

        // Employee timeline events
        if (prevGroupId === null) {
          recordEmployeeTimelineEvent(employeeTimeline, employeeId, day, {
            kind: "starts",
            groupId,
            fromGroupId: null,
          });
        } else if (prevGroupId !== groupId) {
          recordEmployeeTimelineEvent(employeeTimeline, employeeId, day, {
            kind: "switches",
            fromGroupId: prevGroupId,
            toGroupId: groupId,
          });
          recordEmployeeTimelineEvent(employeeTimeline, employeeId, day, {
            kind: "starts",
            groupId,
            fromGroupId: prevGroupId,
          });
        }
        inDowntimeByEmployee.set(employeeId, false);

        // Crew timeline events — handle entry/exit transitions
        if (prevGroupId !== groupId) {
          if (prevGroupId !== null) {
            const prevActive = activeEmployeesByGroup.get(prevGroupId);
            if (prevActive) prevActive.delete(employeeId);
            recordCrewTimelineEvent(crewTimelines, prevGroupId, {
              date: day,
              employeeId,
              kind: "leaves",
              toGroupId: groupId,
              employeeDailyRate: goalRate,
              teamDailyRate: computeTeamRate(prevGroupId, activeEmployeesByGroup, plan.groupAssignments, contextByGroupId),
              poolRemaining: poolStates.get(prevGroupId)?.poolRemaining ?? 0,
            });
          }
          if (!activeEmployeesByGroup.has(groupId)) activeEmployeesByGroup.set(groupId, new Set());
          activeEmployeesByGroup.get(groupId)!.add(employeeId);
          recordCrewTimelineEvent(crewTimelines, groupId, {
            date: day,
            employeeId,
            kind: prevGroupId === null ? "starts" : "returns",
            fromGroupId: prevGroupId ?? undefined,
            employeeDailyRate: goalRate,
            teamDailyRate: computeTeamRate(groupId, activeEmployeesByGroup, plan.groupAssignments, contextByGroupId),
            poolRemaining: poolState.poolRemaining,
          });
        }

        // Check if pool drained
        if (poolState.poolRemaining <= 0) {
          poolState.projectedEndDate = day;
          recordEmployeeTimelineEvent(employeeTimeline, employeeId, day, {
            kind: "finishes",
            groupId,
          });
          activeEmployeesByGroup.get(groupId)?.delete(employeeId);
          recordCrewTimelineEvent(crewTimelines, groupId, {
            date: day,
            employeeId,
            kind: "finishes",
            employeeDailyRate: goalRate,
            teamDailyRate: 0,
            poolRemaining: 0,
          });
        }

        break; // employee works only one group per day (highest priority)
      }

      // Record downtime
      if (workedGroupId === null) {
        if (prevGroupId !== null) {
          activeEmployeesByGroup.get(prevGroupId)?.delete(employeeId);
        }
        if (!inDowntimeByEmployee.get(employeeId)) {
          recordEmployeeTimelineEvent(employeeTimeline, employeeId, day, { kind: "downtime" });
          inDowntimeByEmployee.set(employeeId, true);
        }
      }

      lastWorkedGroupByEmployee.set(employeeId, workedGroupId);
    }

    // Append pool history snapshot only for groups that had remaining work at the start of this day.
    // Groups already at zero before this day started don't need projected zero-snapshots.
    for (const poolState of poolStates.values()) {
      if (activeGroupIds.has(poolState.groupId)) {
        const groupDailyStats = dailyGroupStats.get(poolState.groupId);
        poolState.poolHistory.push({
          date: day,
          completed: poolState.completedSoFar,
          remaining: poolState.poolRemaining,
          priceCompleted: groupDailyStats?.priceCompleted ?? 0,
          priceForecasted: groupDailyStats?.priceForecasted ?? 0,
          employeesWorking: groupDailyStats?.employeesWorking ?? [],
          percentCompleted: poolState.totalPool > 0 ? poolState.completedSoFar / poolState.totalPool : 0,
        });
      }
    }

    day = dateStrings.nextWeekdayAfter(day);
  }

  return { poolStates, servCodeToGroupId, employeeTimeline, crewTimelines, groupProductionStats };
}

function computeTeamRate(
  groupId: string,
  activeEmployeesByGroup: Map<string, Set<string>>,
  groupAssignments: { groupId: string; dailyRevenueGoal: number | null }[],
  contextByGroupId: Map<string, GroupContext>,
): number {
  const active = activeEmployeesByGroup.get(groupId);
  if (!active || active.size === 0) return 0;
  const context = contextByGroupId.get(groupId);
  if (!context) return 0;
  let total = 0;
  for (const empId of active) {
    const goal = context.goalsByEmployee.get(empId) ?? 0;
    total += goal ?? 0;
  }
  return total;
}
