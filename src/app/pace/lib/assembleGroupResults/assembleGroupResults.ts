import {
  EmployeeGroupBreakdown,
  GroupContext,
  GroupResult,
  MemberResult,
  PaceEngineResult,
  PoolDaySnapshot,
  SequenceResult,
} from "@/app/pace/PaceEngineTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { FuturePhaseState } from "@/app/pace/lib/crawlFuturePhase/crawlFuturePhase";
import {
  computePaceAnalysis,
  PaceAnalysis,
} from "./helpers/computePaceAnalysis";
import { computeEmployeeBreakdowns } from "./helpers/computeEmployeeBreakdowns";
import { classifyUrgency } from "./helpers/classifyUrgency";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap", "printed"]));

/**
 * Merges multiple groups' poolHistory arrays by summing snapshots on matching dates.
 * Dates that appear in some but not all groups are included with partial sums.
 */
function mergePoolHistories(histories: PoolDaySnapshot[][]): PoolDaySnapshot[] {
  const byDate = new Map<string, {
    completed: number;
    remaining: number;
    priceCompleted: number;
    priceForecasted: number;
    employeesWorking: string[];
    percentCompleted: number;
    employeeBreakdowns: { employeeId: string; priceCompleted: number; priceForecasted: number }[];
  }>();

  for (const history of histories) {
    for (const snapshot of history) {
      const existing = byDate.get(snapshot.date) ?? {
        completed: 0,
        remaining: 0,
        priceCompleted: 0,
        priceForecasted: 0,
        employeesWorking: [] as string[],
        percentCompleted: 0,
        employeeBreakdowns: [] as { employeeId: string; priceCompleted: number; priceForecasted: number }[],
      };
      const mergedEmployees = [...new Set([...existing.employeesWorking, ...snapshot.employeesWorking])];
      const mergedCompleted = existing.completed + snapshot.completed;
      const mergedRemaining = existing.remaining + snapshot.remaining;

      // Merge employee breakdowns
      const mergedBreakdowns = [...existing.employeeBreakdowns];
      for (const bd of snapshot.employeeBreakdowns) {
        const existingBd = mergedBreakdowns.find((b) => b.employeeId === bd.employeeId);
        if (existingBd) {
          existingBd.priceCompleted += bd.priceCompleted;
          existingBd.priceForecasted += bd.priceForecasted;
        } else {
          mergedBreakdowns.push({ ...bd });
        }
      }

      byDate.set(snapshot.date, {
        completed: mergedCompleted,
        remaining: mergedRemaining,
        priceCompleted: existing.priceCompleted + snapshot.priceCompleted,
        priceForecasted: existing.priceForecasted + snapshot.priceForecasted,
        employeesWorking: mergedEmployees,
        percentCompleted: (mergedCompleted + mergedRemaining) > 0 ? mergedCompleted / (mergedCompleted + mergedRemaining) : 0,
        employeeBreakdowns: mergedBreakdowns,
      });
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { completed, remaining, priceCompleted, priceForecasted, employeesWorking, percentCompleted, employeeBreakdowns }]) => ({
      date,
      completed,
      remaining,
      priceCompleted,
      priceForecasted,
      employeesWorking,
      percentCompleted,
      employeeBreakdowns,
    }));
}

/**
 * Phase 4: Combine past + present + future into GroupResult[] and SequenceResult[].
 *
 * For each group context, assembles the full GroupResult by reading from:
 * - The group context (static metadata)
 * - The pool state (computed by past + future phases)
 * - The crew timelines (from future phase)
 * - The employee timeline (from future phase)
 *
 * Then builds SequenceResult[] from inputs.sequences (already normalized to include
 * synthetic single-member sequences for standalone groups).
 *
 * Also computes:
 * - Pace analysis (single source of truth for daysNeeded, daysEarlyLate, etc.)
 * - Employee breakdowns (per-employee goal/avg/required rates)
 * - Member results (per-servCode pool and deadline data)
 * - Urgency classification (urgentGroups)
 * - Season metadata (seasonStart, seasonEnd)
 */
export function assembleGroupResults(
  inputs: PaceEngineInputs,
  groupContexts: GroupContext[],
  futureState: FuturePhaseState,
): PaceEngineResult {
  const { mainDate, holidayDates } = inputs;
  const { poolStates, employeeTimeline, crewTimelines, groupProductionStats } = futureState;

  const allGroupResults: GroupResult[] = [];

  for (const context of groupContexts) {
    const {
      groupId,
      label,
      memberServCodeIds,
      sequenceId,
      plannedStart,
      plannedEnd,
      goalsByEmployee,
      assignedEmployeeIds,
    } = context;

    const poolState = poolStates.get(groupId);
    const activePool = poolState?.poolRemaining ?? 0;
    const totalPool = poolState?.totalPool ?? 0;
    // hasWork reflects the post-future-phase pool (projected remaining).
    // For overdue detection we use overdueAsOfMainDate from the past phase,
    // which captures whether real work existed as of mainDate before the future
    // phase drained poolRemaining to zero via projection.
    const hasWork = activePool > 0 || (poolState?.overdueAsOfMainDate ?? false);

    const actualPriceCompleted = poolState?.completedSoFar ?? 0;
    const actualDaysWorked = poolState?.productionDays ?? 0;
    const actualTeamDailyRate =
      actualDaysWorked > 0
        ? (poolState?.productionSum ?? 0) / actualDaysWorked
        : null;

    const planDeadlineWeekdays =
      plannedEnd && plannedEnd > mainDate
        ? dateRanges.weekdaysBetween(mainDate, plannedEnd)
        : 0;

    const paceAnalysis: PaceAnalysis = computePaceAnalysis({
      assignedEmployeeIds,
      goalsByEmployee,
      activePool,
      plannedEnd,
      mainDate,
      holidayDates,
    });

    const employeeProductionStats =
      groupProductionStats.get(groupId)?.byEmployee ?? new Map();

    const employeeBreakdowns: EmployeeGroupBreakdown[] = computeEmployeeBreakdowns({
      assignedEmployeeIds,
      goalsByEmployee,
      teamGoalDailyRate: paceAnalysis.teamGoalDailyRate,
      activePool,
      daysAvailable: paceAnalysis.daysAvailable,
      employeeProductionStats,
    });

    // Build per-member results
    const members: MemberResult[] = memberServCodeIds.map(
      (servCodeId): MemberResult => {
        const servCode = inputs.servCodes.find((sc) => sc.servCodeId === servCodeId);
        const memberActivePool = servCode
          ? servCode.services
              .filter((s) => ACTIVE_STATUSES.has(s.status))
              .reduce((sum, s) => sum + s.price, 0)
          : 0;

        const memberPlannedEnd = plannedEnd; // all members share the group's plannedEnd
        const remainingWeekdays =
          memberPlannedEnd && memberPlannedEnd > mainDate
            ? dateRanges.weekdaysBetween(mainDate, memberPlannedEnd)
            : 0;
        const isOverdue =
          memberPlannedEnd !== null &&
          memberPlannedEnd < mainDate &&
          memberActivePool > 0;

        return {
          servCodeId,
          activePool: memberActivePool,
          plannedEnd: memberPlannedEnd,
          remainingWeekdays,
          projectedEndDate: poolState?.projectedEndDate ?? null,
          isOverdue,
        };
      },
    );

    const crewTimeline = crewTimelines.get(groupId) ?? [];
    const poolHistory = poolState?.poolHistory ?? [];

    allGroupResults.push({
      groupId,
      label,
      memberServCodeIds,
      sequenceId,
      plannedStart,
      plannedEnd,
      planDeadlineWeekdays,
      activePool,
      totalPool,
      hasWork,
      actualPriceCompleted,
      actualDaysWorked,
      actualTeamDailyRate,
      projectedEndDate: poolState?.projectedEndDate ?? null,
      projectedStartDate: poolState?.projectedStartDate ?? null,
      missingGoals: paceAnalysis.missingGoals,
      teamGoalDailyRate: paceAnalysis.teamGoalDailyRate,
      daysNeeded: paceAnalysis.daysNeeded,
      daysAvailable: paceAnalysis.daysAvailable,
      daysEarlyLate: paceAnalysis.daysEarlyLate,
      isOnTrack: paceAnalysis.isOnTrack,
      // Use overdueAsOfMainDate from the past phase — paceAnalysis.isOverdue recomputes
      // from the post-future-phase activePool which may be 0 after projection drains it.
      isOverdue: poolState?.overdueAsOfMainDate ?? paceAnalysis.isOverdue,
      employeeBreakdowns,
      crewTimeline,
      poolHistory,
      members,
    });
  }

  const groupMap = new Map(allGroupResults.map((g) => [g.groupId, g]));
  const urgentGroups = classifyUrgency(allGroupResults);

  // Build SequenceResult[] from normalized sequences (includes synthetic single-member sequences)
  const sequenceResults: SequenceResult[] = [];
  for (const sequence of inputs.sequences) {
    const members = sequence.groupIds
      .map((groupId) => groupMap.get(groupId))
      .filter((g): g is GroupResult => g !== undefined);

    if (members.length === 0) continue;

    const mergedHistory = mergePoolHistories(members.map((m) => m.poolHistory));

    const plannedStarts = members.map((m) => m.plannedStart).filter((d): d is string => d !== null);
    const plannedEnds = members.map((m) => m.plannedEnd).filter((d): d is string => d !== null);
    const projectedStarts = members.map((m) => m.projectedStartDate).filter((d): d is string => d !== null);
    const projectedEnds = members.map((m) => m.projectedEndDate).filter((d): d is string => d !== null);

    sequenceResults.push({
      sequenceId: sequence.sequenceId,
      label: sequence.label,
      isSynthetic: sequence.groupIds.length === 1,
      members,
      poolHistory: mergedHistory,
      plannedStart: plannedStarts.length > 0 ? [...plannedStarts].sort()[0]! : null,
      plannedEnd: plannedEnds.length > 0 ? [...plannedEnds].sort().at(-1)! : null,
      projectedStartDate: projectedStarts.length > 0 ? [...projectedStarts].sort()[0]! : null,
      projectedEndDate: projectedEnds.length > 0 ? [...projectedEnds].sort().at(-1)! : null,
      totalPool: members.reduce((sum, m) => sum + m.totalPool, 0),
      hasWork: members.some((m) => m.hasWork),
      isOverdue: members.some((m) => m.isOverdue),
    });
  }

  const sequenceResultMap = new Map(sequenceResults.map((s) => [s.sequenceId, s]));

  // Compute season metadata
  const allPlannedStarts = allGroupResults
    .map((g) => g.plannedStart)
    .filter((d): d is string => d !== null);
  const allPlannedEnds = allGroupResults
    .map((g) => g.plannedEnd)
    .filter((d): d is string => d !== null);

  const snowMelt = inputs.activeSeasonPlan?.snowMelt ?? null;
  const snowDeadline = inputs.activeSeasonPlan?.snowDeadline ?? null;

  const seasonStart =
    snowMelt ??
    (allPlannedStarts.length > 0 ? [...allPlannedStarts].sort()[0]! : mainDate);
  const seasonEnd =
    snowDeadline ??
    (allPlannedEnds.length > 0 ? [...allPlannedEnds].sort().at(-1)! : mainDate);

  return {
    sequenceResults,
    sequenceResultMap,
    groupMap,
    employeeTimeline,
    urgentGroups,
    mainDate,
    seasonStart,
    seasonEnd,
  };
}
