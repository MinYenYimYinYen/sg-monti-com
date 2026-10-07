import {
  GroupPoolState,
  EmployeeTimelineEvent,
  ServCodeTimelineEvent,
} from "@/app/pace/lib/PaceEngineTypes";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { PresentPhaseState } from "@/app/pace/lib/crawlPresentPhase/crawlPresentPhase";
import { GroupProductionStats } from "@/app/pace/lib/crawlPastPhase/helpers/computeActualGroupRates";
import { drainGroupPool } from "./helpers/drainGroupPool";
import { recordEmployeeTimelineEvent, recordCrewTimelineEvent } from "./helpers/recordTimelineEvent";
import { resolveSequenceCascade } from "./helpers/resolveSequenceCascade";
import { GroupSequenceClassifier } from "@/app/pace/lib/groupSequenceClassifier";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

export type FuturePhaseState = {
  poolStates: Map<string, GroupPoolState>;
  servCodeToGroupId: Map<string, string>;
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
  crewTimelines: Map<string, ServCodeTimelineEvent[]>;
  groupProductionStats: Map<string, GroupProductionStats>;
  crawlerDays: CrawlerDay[];
};

const MAX_FUTURE_WEEKDAYS = 365;

export function crawlFuturePhase(
  inputs: PaceEngineInputs,
  assignmentGroups: AssignmentGroup[],
  presentState: PresentPhaseState,
  classifier: GroupSequenceClassifier,
): FuturePhaseState {
  const { mainDate, sequences, cascadeThreshold, employees } = inputs;
  const { poolStates, servCodeToGroupId, groupProductionStats } = presentState;

  const activeEmployees: Employee[] = employees.filter((employee) =>
    assignmentGroups.some((ag) => ag.assignedEmployeeIds.includes(employee.employeeId)),
  );

  const assignmentGroupByGroupId = new Map<string, AssignmentGroup>();
  for (const ag of assignmentGroups) {
    assignmentGroupByGroupId.set(ag.groupId, ag);
  }

  const plannedEndByGroupId = new Map<string, string | null>();
  const plannedStartByGroupId = new Map<string, string | null>();
  for (const ag of assignmentGroups) {
    plannedEndByGroupId.set(ag.groupId, ag.plannedEnd);
    plannedStartByGroupId.set(ag.groupId, ag.plannedStart);
  }

  const lockedGroupIds = new Set<string>();
  for (const sequence of sequences) {
    for (let i = 1; i < sequence.groupIds.length; i++) {
      lockedGroupIds.add(sequence.groupIds[i]);
    }
  }

  resolveSequenceCascade({
    sequences,
    poolStates,
    lockedGroupIds,
    groupScheduleMap: plannedEndByGroupId,
    successorPlannedStartMap: plannedStartByGroupId,
    cascadeThreshold,
    day: mainDate,
  });

  const employeeTimeline = new Map<string, { date: string; event: EmployeeTimelineEvent }[]>();
  const crewTimelines = new Map<string, ServCodeTimelineEvent[]>();
  const lastWorkedGroupByEmployee = new Map<string, string | null>();
  const inDowntimeByEmployee = new Map<string, boolean>();
  const activeEmployeesByGroup = new Map<string, Set<string>>();

  for (const employee of activeEmployees) {
    employeeTimeline.set(employee.employeeId, []);
    lastWorkedGroupByEmployee.set(employee.employeeId, null);
    inDowntimeByEmployee.set(employee.employeeId, false);
  }

  const crawlerDays: CrawlerDay[] = [];

  const sequenceIdByGroupId = new Map<string, string | null>();
  for (const sequence of sequences) {
    const isSynthetic = sequence.groupIds.length === 1;
    for (const groupId of sequence.groupIds) {
      sequenceIdByGroupId.set(groupId, isSynthetic ? null : sequence.sequenceId);
    }
  }

  // Cumulative priceCompleted per employee per group across future days.
  const employeeCumulativeByGroup = new Map<string, Map<string, number>>();

  let day = dateStrings.nextWeekdayAfter(mainDate);
  const maxDay = dateStrings.addWeekdays(mainDate, MAX_FUTURE_WEEKDAYS);

  while (day <= maxDay) {
    resolveSequenceCascade({
      sequences,
      poolStates,
      lockedGroupIds,
      groupScheduleMap: plannedEndByGroupId,
      successorPlannedStartMap: plannedStartByGroupId,
      cascadeThreshold,
      day,
    });

    let anyRemaining = false;
    const activeGroupIds = new Set<string>();
    for (const [groupId, state] of poolStates) {
      if (state.poolRemaining <= 0) continue;
      if (!classifier.isActiveForSnapshot(groupId, lockedGroupIds)) continue;

      const plannedEnd = plannedEndByGroupId.get(groupId) ?? null;
      const completionPct = state.totalPool > 0 ? state.completedSoFar / state.totalPool : 0;
      const isStraggler = classifier.isStraggler({ groupId, day, plannedEnd, completionPct, cascadeThreshold });

      if (!isStraggler) {
        anyRemaining = true;
        activeGroupIds.add(groupId);
      }
    }
    if (!anyRemaining) break;

    type DailyGroupStats = {
      priceCompleted: number;
      priceForecasted: number;
      employeesWorking: string[];
      employeeBreakdowns: { employeeId: string; priceCompleted: number; priceForecasted: number }[];
    };
    const dailyGroupStats = new Map<string, DailyGroupStats>();

    for (const employee of activeEmployees) {
      const { employeeId, availability, timeOffDates } = employee;

      if (timeOffDates.has(day)) {
        lastWorkedGroupByEmployee.set(employeeId, null);
        continue;
      }

      if (availability.startDate && day < availability.startDate) continue;
      if (availability.endDate && day > availability.endDate) continue;

      const prevGroupId = lastWorkedGroupByEmployee.get(employeeId) ?? null;
      let workedGroupId: string | null = null;

      const plan = inputs.assignmentsByEmployeeId.get(employeeId);
      if (!plan) continue;

      for (const { groupId } of plan.groupAssignments) {
        if (lockedGroupIds.has(groupId)) continue;

        const poolState = poolStates.get(groupId);
        if (!poolState || poolState.poolRemaining <= 0) continue;

        const assignmentGroup = assignmentGroupByGroupId.get(groupId);
        if (!assignmentGroup) continue;

        if (assignmentGroup.plannedStart && day < assignmentGroup.plannedStart) continue;

        const goalRate = assignmentGroup.goalsByEmployee.get(employeeId) ?? null;
        if (goalRate === null || goalRate <= 0) continue;

        const drained = drainGroupPool({ poolState, goalRate });

        if (drained <= 0) continue;

        workedGroupId = groupId;

        if (!dailyGroupStats.has(groupId)) {
          dailyGroupStats.set(groupId, {
            priceCompleted: 0,
            priceForecasted: 0,
            employeesWorking: [],
            employeeBreakdowns: [],
          });
        }
        const existing = dailyGroupStats.get(groupId)!;
        const existingBreakdown = existing.employeeBreakdowns.find((b) => b.employeeId === employeeId);
        if (existingBreakdown) {
          existingBreakdown.priceCompleted += drained;
          existingBreakdown.priceForecasted += goalRate;
        } else {
          existing.employeeBreakdowns.push({ employeeId, priceCompleted: drained, priceForecasted: goalRate });
        }
        dailyGroupStats.set(groupId, {
          priceCompleted: existing.priceCompleted + drained,
          priceForecasted: existing.priceForecasted + goalRate,
          employeesWorking: existing.employeesWorking.includes(employeeId)
            ? existing.employeesWorking
            : [...existing.employeesWorking, employeeId],
          employeeBreakdowns: existing.employeeBreakdowns,
        });

        if (!poolState.projectedStartDate) {
          poolState.projectedStartDate = day;
        }

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
              teamDailyRate: computeTeamRate(prevGroupId, activeEmployeesByGroup, plan.groupAssignments, assignmentGroupByGroupId),
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
            teamDailyRate: computeTeamRate(groupId, activeEmployeesByGroup, plan.groupAssignments, assignmentGroupByGroupId),
            poolRemaining: poolState.poolRemaining,
          });
        }

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

        break;
      }

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

    const crawlerDayGroups: CrawlerDayGroup[] = [];
    for (const poolState of poolStates.values()) {
      if (activeGroupIds.has(poolState.groupId)) {
        const groupDailyStats = dailyGroupStats.get(poolState.groupId);
        const assignmentGroup = assignmentGroupByGroupId.get(poolState.groupId);
        const groupId = poolState.groupId;

        if (!employeeCumulativeByGroup.has(groupId)) {
          employeeCumulativeByGroup.set(groupId, new Map());
        }
        const empCumulative = employeeCumulativeByGroup.get(groupId)!;
        for (const bd of groupDailyStats?.employeeBreakdowns ?? []) {
          empCumulative.set(bd.employeeId, (empCumulative.get(bd.employeeId) ?? 0) + bd.priceCompleted);
        }

        crawlerDayGroups.push({
          groupId,
          label: assignmentGroup?.label ?? groupId,
          sequenceId: sequenceIdByGroupId.get(groupId) ?? null,
          poolCompletedSoFar: poolState.completedSoFar,
          poolRemaining: poolState.poolRemaining,
          priceCompleted: groupDailyStats?.priceCompleted ?? 0,
          priceForecasted: groupDailyStats?.priceForecasted ?? 0,
          percentCompleted: poolState.totalPool > 0 ? poolState.completedSoFar / poolState.totalPool : 0,
          totalPool: poolState.totalPool,
          cascadedToSuccessor: false,
          employees: (groupDailyStats?.employeeBreakdowns ?? []).map((bd) => ({
            employeeId: bd.employeeId,
            priceCompleted: bd.priceCompleted,
            priceForecasted: bd.priceForecasted,
            priceCompletedSoFar: empCumulative.get(bd.employeeId) ?? bd.priceCompleted,
          })),
        });
      }
    }

    if (crawlerDayGroups.length > 0) {
      crawlerDays.push({ date: day, phase: "future", groups: crawlerDayGroups });
    }

    day = dateStrings.nextWeekdayAfter(day);
  }

  return { poolStates, servCodeToGroupId, employeeTimeline, crewTimelines, groupProductionStats, crawlerDays };
}

function computeTeamRate(
  groupId: string,
  activeEmployeesByGroup: Map<string, Set<string>>,
  groupAssignments: { groupId: string; dailyRevenueGoal: number | null }[],
  assignmentGroupByGroupId: Map<string, AssignmentGroup>,
): number {
  const active = activeEmployeesByGroup.get(groupId);
  if (!active || active.size === 0) return 0;
  const assignmentGroup = assignmentGroupByGroupId.get(groupId);
  if (!assignmentGroup) return 0;
  let total = 0;
  for (const empId of active) {
    const goal = assignmentGroup.goalsByEmployee.get(empId) ?? 0;
    total += goal ?? 0;
  }
  return total;
}
