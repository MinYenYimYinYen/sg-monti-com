import {
  EmployeeGroupBreakdown,
  GroupContext,
  GroupResult,
  MemberResult,
  PaceEngineResult,
  PoolDaySnapshot,
  PoolDaySnapshotEmployeeBreakdown,
  SequenceResult,
} from "@/app/pace/PaceEngineTypes";
import { CrawlerDay, CrawlerDayGroup } from "@/app/pace/CrawlerDay";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { FuturePhaseState } from "@/app/pace/lib/crawlFuturePhase/crawlFuturePhase";
import { PastPhaseState } from "@/app/pace/lib/crawlPastPhase/crawlPastPhase";
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
  pastState: PastPhaseState,
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

  // Build CrawlerDay[] — past days from pastState.breakdownsByGroupByDate,
  // present (mainDate) from poolStates, future days from futureState.crawlerDays.
  const crawlerDays = buildCrawlerDays({
    mainDate,
    groupContexts,
    poolStates,
    breakdownsByGroupByDate: pastState.breakdownsByGroupByDate,
    futureCrawlerDays: futureState.crawlerDays,
    sequences: inputs.sequences,
  });

  return {
    sequenceResults,
    sequenceResultMap,
    groupMap,
    employeeTimeline,
    urgentGroups,
    mainDate,
    seasonStart,
    seasonEnd,
    crawlerDays,
  };
}

// ---------------------------------------------------------------------------
// CrawlerDay construction helpers
// ---------------------------------------------------------------------------

/**
 * Builds the full CrawlerDay[] spanning past + present + future.
 *
 * Past days: one CrawlerDay per date that appears in breakdownsByGroupByDate
 *   (days with actual production). Groups with no production on a given date
 *   are omitted from that day's groups array.
 *
 * Present (mainDate): one CrawlerDay with all groups that have active pool,
 *   representing the handoff point between actual and projected.
 *
 * Future days: passed through from futureState.crawlerDays (already built
 *   during the future phase loop).
 */
function buildCrawlerDays({
  mainDate,
  groupContexts,
  poolStates,
  breakdownsByGroupByDate,
  futureCrawlerDays,
  sequences,
}: {
  mainDate: string;
  groupContexts: GroupContext[];
  poolStates: Map<string, import("@/app/pace/PaceEngineTypes").GroupPoolState>;
  breakdownsByGroupByDate: Map<string, Map<string, PoolDaySnapshotEmployeeBreakdown[]>>;
  futureCrawlerDays: CrawlerDay[];
  sequences: import("@/app/pace/groupSequence/GroupSequenceTypes").GroupSequence[];
}): CrawlerDay[] {
  // Build groupId → sequenceId map (null for synthetic single-member sequences)
  const sequenceIdByGroupId = new Map<string, string | null>();
  for (const sequence of sequences) {
    const isSynthetic = sequence.groupIds.length === 1;
    for (const groupId of sequence.groupIds) {
      sequenceIdByGroupId.set(groupId, isSynthetic ? null : sequence.sequenceId);
    }
  }

  // Build groupId → label map
  const labelByGroupId = new Map<string, string>();
  for (const ctx of groupContexts) {
    labelByGroupId.set(ctx.groupId, ctx.label);
  }

  // Collect all past production dates across all groups
  const allPastDates = new Set<string>();
  for (const byDate of breakdownsByGroupByDate.values()) {
    for (const date of byDate.keys()) {
      if (date < mainDate) allPastDates.add(date);
    }
  }

  // Build past CrawlerDays — one per production date
  const pastDays: CrawlerDay[] = [...allPastDates].sort().map((date): CrawlerDay => {
    const groups: CrawlerDayGroup[] = [];
    for (const [groupId, byDate] of breakdownsByGroupByDate) {
      const dayBreakdowns = byDate.get(date);
      if (!dayBreakdowns || dayBreakdowns.length === 0) continue;

      const poolState = poolStates.get(groupId);
      const totalPool = poolState?.totalPool ?? 0;
      // For past days, poolCompletedSoFar is approximated from the poolHistory snapshot
      // for this date. If not available, use 0.
      const snapshot = poolState?.poolHistory.find((s) => s.date === date);
      const poolCompletedSoFar = snapshot?.completed ?? 0;
      const poolRemaining = snapshot?.remaining ?? 0;
      const priceCompleted = snapshot?.priceCompleted ?? dayBreakdowns.reduce((sum, bd) => sum + bd.priceCompleted, 0);

      groups.push({
        groupId,
        label: labelByGroupId.get(groupId) ?? groupId,
        sequenceId: sequenceIdByGroupId.get(groupId) ?? null,
        poolCompletedSoFar,
        poolRemaining,
        priceCompleted,
        priceForecasted: 0,
        percentCompleted: totalPool > 0 ? poolCompletedSoFar / totalPool : 0,
        totalPool,
        cascadedToSuccessor: false,
        employees: dayBreakdowns.map((bd) => ({
          employeeId: bd.employeeId,
          priceCompleted: bd.priceCompleted,
          priceForecasted: 0,
        })),
      });
    }
    return { date, phase: "past", groups };
  }).filter((day) => day.groups.length > 0);

  // Build present CrawlerDay (mainDate handoff)
  const presentGroups: CrawlerDayGroup[] = [];
  for (const ctx of groupContexts) {
    const poolState = poolStates.get(ctx.groupId);
    if (!poolState || poolState.poolRemaining <= 0) continue;
    // Only include groups that have a mainDate snapshot (i.e., are open at mainDate)
    const snapshot = poolState.poolHistory.find((s) => s.date === mainDate);
    if (!snapshot) continue;

    presentGroups.push({
      groupId: ctx.groupId,
      label: ctx.label,
      sequenceId: sequenceIdByGroupId.get(ctx.groupId) ?? null,
      poolCompletedSoFar: snapshot.completed,
      poolRemaining: snapshot.remaining,
      priceCompleted: 0,
      priceForecasted: 0,
      percentCompleted: snapshot.percentCompleted,
      totalPool: poolState.totalPool,
      cascadedToSuccessor: false,
      employees: [],
    });
  }

  const presentDay: CrawlerDay[] = presentGroups.length > 0
    ? [{ date: mainDate, phase: "present", groups: presentGroups }]
    : [];

  return [...pastDays, ...presentDay, ...futureCrawlerDays];
}
