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
import {
  buildCrawlServiceQueues,
  ConstrainedGroupQueue,
  addCalendarDays,
} from "./helpers/buildCrawlServiceQueues";
import { fillEmployeesRoundRobin } from "./helpers/fillEmployeesRoundRobin";

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
  const { mainDate, sequences, cascadeThreshold, employees, servCodes } = inputs;
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

  // Sequences with daysSince > 0 use the service-queue constraint system instead of
  // cascade locking. Only non-constrained sequences lock their successors.
  const constrainedSequenceIds = new Set(
    sequences.filter((s) => s.daysSince > 0).map((s) => s.sequenceId),
  );
  const cascadeSequences = sequences.filter((s) => !constrainedSequenceIds.has(s.sequenceId));

  const lockedGroupIds = new Set<string>();
  for (const sequence of cascadeSequences) {
    for (let i = 1; i < sequence.groupIds.length; i++) {
      lockedGroupIds.add(sequence.groupIds[i]);
    }
  }

  resolveSequenceCascade({
    sequences: cascadeSequences,
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

  // ---------------------------------------------------------------------------
  // Build constrained service queues for sequences with daysSince
  // ---------------------------------------------------------------------------

  // Map<groupId, Set<servCodeId>> for quick lookup
  const groupServCodeIds = new Map<string, Set<string>>();
  for (const ag of assignmentGroups) {
    groupServCodeIds.set(ag.groupId, new Set(ag.servCodeIds));
  }

  const constrainedQueues: Map<string, ConstrainedGroupQueue> = buildCrawlServiceQueues({
    servCodes,
    sequences,
    servCodeToGroupId,
    groupServCodeIds,
    mainDate,
  });

  // Build a lookup: for each constrained successor group, which sequence and predecessor?
  // Map<successorGroupId, { predecessorGroupId, daysSince }>
  const successorConstraintMap = new Map<string, { predecessorGroupId: string; daysSince: number }>();
  for (const sequence of sequences) {
    if (sequence.daysSince <= 0 || sequence.groupIds.length < 2) continue;
    for (let i = 1; i < sequence.groupIds.length; i++) {
      successorConstraintMap.set(sequence.groupIds[i]!, {
        predecessorGroupId: sequence.groupIds[i - 1]!,
        daysSince: sequence.daysSince,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Pre-compute workable groups — groups with at least one employee with a goal rate.
  // Groups with no workable employees can never be drained and must not count as
  // "remaining" in the termination check — they would cause the crawler to run indefinitely.
  // ---------------------------------------------------------------------------

  const workableGroupIds = new Set<string>();
  for (const ag of assignmentGroups) {
    for (const goalRate of ag.goalsByEmployee.values()) {
      if (goalRate !== null && goalRate > 0) {
        workableGroupIds.add(ag.groupId);
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Reconcile constrained group pool states with their queue sums.
  //
  // The past phase initializes poolRemaining from the aggregate price of all active
  // services. The constrained queue contains individual service objects for those same
  // services. They should match — if they don't, the queue is the source of truth
  // (it reflects exactly which services are workable). Reconcile now so the termination
  // check (poolRemaining <= 0) fires correctly when the queue empties.
  // ---------------------------------------------------------------------------

  // Reconcile: set poolRemaining to the queue sum so termination works correctly
  for (const [groupId, queue] of constrainedQueues) {
    const poolState = poolStates.get(groupId);
    if (!poolState) continue;
    const queueSum = [...queue.available, ...queue.pending].reduce((sum, s) => sum + s.price, 0);
    poolState.poolRemaining = queueSum;
    poolState.totalPool = poolState.completedSoFar + queueSum;
  }

  // ---------------------------------------------------------------------------
  // Main crawl loop
  // ---------------------------------------------------------------------------

  let day = dateStrings.nextWeekdayAfter(mainDate);
  const maxDay = dateStrings.addWeekdays(mainDate, MAX_FUTURE_WEEKDAYS);

  while (day <= maxDay) {
    resolveSequenceCascade({
      sequences: cascadeSequences,
      poolStates,
      lockedGroupIds,
      groupScheduleMap: plannedEndByGroupId,
      successorPlannedStartMap: plannedStartByGroupId,
      cascadeThreshold,
      day,
    });

    // Promote pending → available for constrained queues based on today's date
    for (const [groupId, queue] of constrainedQueues) {
      const constraint = successorConstraintMap.get(groupId);
      if (!constraint) continue; // first group in sequence — no pending

      const { predecessorGroupId, daysSince } = constraint;
      const predecessorQueue = constrainedQueues.get(predecessorGroupId);

      // Check pending services: if their predecessor has a doneDate and daysSince has elapsed.
      // Search available, pending, AND completed — consumed services move to completed.
      const stillPending: typeof queue.pending = [];
      for (const service of queue.pending) {
        // Find the matching predecessor service by progId (check all three lists)
        const predecessorService = predecessorQueue?.available.find((s) => s.progId === service.progId)
          ?? predecessorQueue?.pending.find((s) => s.progId === service.progId)
          ?? predecessorQueue?.completed.find((s) => s.progId === service.progId);

        if (predecessorService === undefined) {
          // No predecessor service exists for this program (e.g. program started mid-sequence).
          // No constraint to enforce — promote to available immediately.
          insertSorted(queue.available, service);
        } else {
          const predecessorDoneDate = predecessorService.doneDate;
          if (predecessorDoneDate !== null) {
            const availableDate = addCalendarDays(predecessorDoneDate, daysSince);
            if (availableDate <= day) {
              // Insert into available maintaining price-descending order
              insertSorted(queue.available, service);
            } else {
              stillPending.push(service);
            }
          } else {
            stillPending.push(service);
          }
        }
      }
      queue.pending = stillPending;
    }

    let anyRemaining = false;
    const activeGroupIds = new Set<string>();
    for (const [groupId, state] of poolStates) {
      if (state.poolRemaining < 0.01) continue; // treat sub-cent as zero (floating point guard)
      if (!workableGroupIds.has(groupId)) continue;
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

    // ---------------------------------------------------------------------------
    // Constrained groups: round-robin fill across all assigned employees
    // ---------------------------------------------------------------------------

    // Process constrained groups first (they have limited available pool)
    const processedByConstrained = new Set<string>();

    for (const [groupId, queue] of constrainedQueues) {
      if (!activeGroupIds.has(groupId)) continue;
      if (lockedGroupIds.has(groupId)) continue;

      const poolState = poolStates.get(groupId);
      if (!poolState || poolState.poolRemaining <= 0) continue;

      const assignmentGroup = assignmentGroupByGroupId.get(groupId);
      if (!assignmentGroup) continue;

      if (assignmentGroup.plannedStart && day < assignmentGroup.plannedStart) continue;

      // Collect all employees assigned to this group with their goal rates
      const employeesForGroup: { employeeId: string; budget: number }[] = [];
      for (const employee of activeEmployees) {
        const { employeeId, availability, timeOffDates } = employee;
        if (timeOffDates.has(day)) continue;
        if (availability.startDate && day < availability.startDate) continue;
        if (availability.endDate && day > availability.endDate) continue;

        const plan = inputs.assignmentsByEmployeeId.get(employeeId);
        if (!plan) continue;

        const assignment = plan.groupAssignments.find((ga) => ga.groupId === groupId);
        if (!assignment) continue;

        const goalRate = assignmentGroup.goalsByEmployee.get(employeeId) ?? null;
        if (goalRate === null || goalRate <= 0) continue;

        employeesForGroup.push({ employeeId, budget: goalRate });
      }

      if (employeesForGroup.length === 0) continue;

      if (queue.available.length === 0) {
        continue;
      }

      // Round-robin fill across employees
      const fillResult = fillEmployeesRoundRobin({
        available: queue.available,
        employees: employeesForGroup,
      });
      const drainedByEmployee = fillResult.drained;
      const consumedServices = fillResult.consumed;

      // Mark consumed predecessor services as done today so successor pending can be promoted.
      // The consumed services were spliced out of queue.available; set their doneDate and
      // move them to queue.completed so successor pending promotion can find them by progId.
      for (const service of consumedServices) {
        service.doneDate = day;
        queue.completed.push(service);
      }

      // Apply drain results to pool state and record stats
      for (const [employeeId, amount] of drainedByEmployee.entries()) {
        if (amount <= 0) continue;

        const goalRate = assignmentGroup.goalsByEmployee.get(employeeId) ?? 0;

        // Drain from pool state
        const actualDrain = Math.min(amount, poolState.poolRemaining);
        poolState.poolRemaining -= actualDrain;
        poolState.completedSoFar += actualDrain;

        if (!poolState.projectedStartDate) {
          poolState.projectedStartDate = day;
        }

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
          existingBreakdown.priceCompleted += actualDrain;
          existingBreakdown.priceForecasted += goalRate;
        } else {
          existing.employeeBreakdowns.push({ employeeId, priceCompleted: actualDrain, priceForecasted: goalRate });
        }
        dailyGroupStats.set(groupId, {
          priceCompleted: existing.priceCompleted + actualDrain,
          priceForecasted: existing.priceForecasted + goalRate,
          employeesWorking: existing.employeesWorking.includes(employeeId)
            ? existing.employeesWorking
            : [...existing.employeesWorking, employeeId],
          employeeBreakdowns: existing.employeeBreakdowns,
        });

        // Record timeline events for this employee
        const prevGroupId = lastWorkedGroupByEmployee.get(employeeId) ?? null;
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
            const prevPlan = inputs.assignmentsByEmployeeId.get(employeeId)!;
            recordCrewTimelineEvent(crewTimelines, prevGroupId, {
              date: day,
              employeeId,
              kind: "leaves",
              toGroupId: groupId,
              employeeDailyRate: goalRate,
              teamDailyRate: computeTeamRate(prevGroupId, activeEmployeesByGroup, prevPlan.groupAssignments, assignmentGroupByGroupId),
              poolRemaining: poolStates.get(prevGroupId)?.poolRemaining ?? 0,
            });
          }
          if (!activeEmployeesByGroup.has(groupId)) activeEmployeesByGroup.set(groupId, new Set());
          activeEmployeesByGroup.get(groupId)!.add(employeeId);
          const plan = inputs.assignmentsByEmployeeId.get(employeeId)!;
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

        lastWorkedGroupByEmployee.set(employeeId, groupId);
        processedByConstrained.add(employeeId);
      }

      if (poolState.poolRemaining <= 0) {
        poolState.projectedEndDate = day;
        for (const [employeeId] of drainedByEmployee.entries()) {
          if ((drainedByEmployee.get(employeeId) ?? 0) > 0) {
            recordEmployeeTimelineEvent(employeeTimeline, employeeId, day, {
              kind: "finishes",
              groupId,
            });
            activeEmployeesByGroup.get(groupId)?.delete(employeeId);
            const goalRate = assignmentGroup.goalsByEmployee.get(employeeId) ?? 0;
            recordCrewTimelineEvent(crewTimelines, groupId, {
              date: day,
              employeeId,
              kind: "finishes",
              employeeDailyRate: goalRate,
              teamDailyRate: 0,
              poolRemaining: 0,
            });
          }
        }
      }
    }

    // ---------------------------------------------------------------------------
    // Unconstrained groups: original per-employee goal-rate drain
    // ---------------------------------------------------------------------------

    for (const employee of activeEmployees) {
      const { employeeId, availability, timeOffDates } = employee;

      if (timeOffDates.has(day)) {
        lastWorkedGroupByEmployee.set(employeeId, null);
        continue;
      }

      if (availability.startDate && day < availability.startDate) continue;
      if (availability.endDate && day > availability.endDate) continue;

      // Skip employees already handled by constrained group processing
      if (processedByConstrained.has(employeeId)) continue;

      const prevGroupId = lastWorkedGroupByEmployee.get(employeeId) ?? null;
      let workedGroupId: string | null = null;

      const plan = inputs.assignmentsByEmployeeId.get(employeeId);
      if (!plan) continue;

      for (const { groupId } of plan.groupAssignments) {
        if (lockedGroupIds.has(groupId)) continue;

        // Skip constrained groups — they're handled above
        if (constrainedQueues.has(groupId)) continue;

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

// ---------------------------------------------------------------------------
// insertSorted — insert into price-descending sorted array
// ---------------------------------------------------------------------------

/**
 * Inserts a CrawlService into a price-descending sorted array at the correct position.
 * O(n) in the worst case but keeps the array sorted for binary search.
 */
function insertSorted(arr: { price: number }[], item: { price: number }): void {
  let i = 0;
  while (i < arr.length && arr[i]!.price >= item.price) i++;
  arr.splice(i, 0, item);
}
