import {
  EmployeeGroupBreakdown,
  GroupContext,
  GroupResult,
  MemberResult,
  PaceEngineResult,
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
 * Phase 4: Combine past + present + future into GroupResult[].
 *
 * For each group context, assembles the full GroupResult by reading from:
 * - The group context (static metadata)
 * - The pool state (computed by past + future phases)
 * - The crew timelines (from future phase)
 * - The employee timeline (from future phase)
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

  const groups: GroupResult[] = [];

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
    const hasWork = activePool > 0;

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

    groups.push({
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
      isOverdue: paceAnalysis.isOverdue,
      employeeBreakdowns,
      crewTimeline,
      poolHistory,
      members,
    });
  }

  const groupMap = new Map(groups.map((g) => [g.groupId, g]));
  const urgentGroups = classifyUrgency(groups);

  // Compute season metadata
  const allPlannedStarts = groups
    .map((g) => g.plannedStart)
    .filter((d): d is string => d !== null);
  const allPlannedEnds = groups
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
    groups,
    groupMap,
    employeeTimeline,
    urgentGroups,
    mainDate,
    seasonStart,
    seasonEnd,
  };
}
