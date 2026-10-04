import { GroupContext, GroupPoolState, PoolDaySnapshot } from "@/app/pace/PaceEngineTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { accumulateActualProduction } from "./helpers/accumulateActualProduction";
import { computeActualGroupRates, GroupProductionStats } from "./helpers/computeActualGroupRates";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const ACTIVE_STATUSES = new Set(getServiceStatuses(["active", "asap"]));

export type PastPhaseState = {
  /** Mutable pool state per group, initialized from past-phase data. */
  poolStates: Map<string, GroupPoolState>;
  /** servCodeId → groupId reverse lookup. */
  servCodeToGroupId: Map<string, string>;
  /** Per-group production stats including per-employee breakdown. */
  groupProductionStats: Map<string, GroupProductionStats>;
};

/**
 * Phase 1: Walk days < mainDate.
 *
 * Responsibilities:
 * 1. Build servCodeId → groupId reverse lookup from group contexts.
 * 2. Compute each group's active pool (actionable services as of mainDate).
 * 3. Compute each group's total pool (all non-N services).
 * 4. Accumulate actual production history from completed/printed services (per-employee).
 * 5. Compute per-group and per-employee actual rates.
 * 6. Initialize GroupPoolState for each group with past-phase data.
 * 7. Populate poolHistory for past days (completed = cumulative, remaining = active pool).
 *
 * The past phase does NOT walk day-by-day — it reads service data directly.
 * Day-by-day walking happens in the future phase only.
 */
export function crawlPastPhase(
  inputs: PaceEngineInputs,
  groupContexts: GroupContext[],
): PastPhaseState {
  const { servCodes, mainDate } = inputs;

  // Build servCodeId → groupId reverse lookup
  const servCodeToGroupId = new Map<string, string>();
  for (const context of groupContexts) {
    for (const servCodeId of context.memberServCodeIds) {
      servCodeToGroupId.set(servCodeId, context.groupId);
    }
  }

  // Compute active pool and total pool per group
  const activePoolByGroup = new Map<string, number>();
  const totalPoolByGroup = new Map<string, number>();

  for (const servCode of servCodes) {
    const groupId = servCodeToGroupId.get(servCode.servCodeId);
    if (!groupId) continue;

    for (const service of servCode.services) {
      if (service.status === "N") continue; // never — excluded from all pools

      // Total pool: all non-N services
      totalPoolByGroup.set(groupId, (totalPoolByGroup.get(groupId) ?? 0) + service.price);

      // Active pool: actionable services only (Y, *, $)
      if (ACTIVE_STATUSES.has(service.status) || service.status === "$") {
        activePoolByGroup.set(groupId, (activePoolByGroup.get(groupId) ?? 0) + service.price);
      }
    }
  }

  // Accumulate actual production history (per-employee breakdown)
  const productionByGroupByEmployeeByDate = accumulateActualProduction(
    servCodes,
    servCodeToGroupId,
    mainDate,
  );

  // Compute per-group and per-employee actual rates
  const groupProductionStats = computeActualGroupRates(productionByGroupByEmployeeByDate);

  // Build set of last-in-sequence / standalone groupIds for straggler detection.
  const lastInSequenceGroupIds = new Set<string>();
  const sequenceGroupIdSets = new Set(inputs.sequences.flatMap((s) => s.groupIds));
  for (const context of groupContexts) {
    if (!sequenceGroupIdSets.has(context.groupId)) {
      lastInSequenceGroupIds.add(context.groupId);
    }
  }
  for (const sequence of inputs.sequences) {
    const lastGroupId = sequence.groupIds.at(-1);
    if (lastGroupId) lastInSequenceGroupIds.add(lastGroupId);
  }

  // Build pool history for past days.
  // We record one snapshot per production day (days with actual work).
  // The mainDate snapshot is the handoff point.
  function buildPastPoolHistory(
    groupId: string,
    activePool: number,
    totalPool: number,
    plannedEnd: string | null,
  ): PoolDaySnapshot[] {
    const stats = groupProductionStats.get(groupId);

    // Collect all unique dates across all employees for this group
    const byEmployeeByDate = productionByGroupByEmployeeByDate.get(groupId);
    if (!byEmployeeByDate || byEmployeeByDate.size === 0 || !stats) {
      return [{
        date: mainDate,
        completed: totalPool - activePool,
        remaining: activePool,
        priceCompleted: 0,
        priceForecasted: 0,
        employeesWorking: [],
        percentCompleted: totalPool > 0 ? (totalPool - activePool) / totalPool : 0,
      }];
    }

    // Merge all employee dates into a single date → total map,
    // and build a date → employeeIds map for employeesWorking.
    const byDate = new Map<string, number>();
    const employeesByDate = new Map<string, string[]>();
    for (const [employeeId, employeeDates] of byEmployeeByDate) {
      for (const [date, dailyPrice] of employeeDates) {
        byDate.set(date, (byDate.get(date) ?? 0) + dailyPrice);
        if (employeeId !== "_team") {
          const existing = employeesByDate.get(date) ?? [];
          if (!existing.includes(employeeId)) existing.push(employeeId);
          employeesByDate.set(date, existing);
        }
      }
    }

    const sortedDates = [...byDate.keys()].sort();
    const snapshots: PoolDaySnapshot[] = [];
    let cumulativeCompleted = 0;
    // Track whether the straggler condition was ever met during the crawl.
    // When true, the mainDate handoff snapshot is suppressed — the group is overdue
    // and the last real production snapshot is its final entry.
    let stragglerDetected = false;

    for (const date of sortedDates) {
      const dailyPrice = byDate.get(date)!;
      cumulativeCompleted += dailyPrice;
      const remaining = Math.max(0, totalPool - cumulativeCompleted);
      const percentCompleted = totalPool > 0 ? cumulativeCompleted / totalPool : 0;

      snapshots.push({
        date,
        completed: cumulativeCompleted,
        remaining,
        priceCompleted: dailyPrice,
        priceForecasted: 0,
        employeesWorking: employeesByDate.get(date) ?? [],
        percentCompleted,
      });

      // Detect when the group crosses the cascade threshold past its plannedEnd.
      // We do NOT break — all production dates are recorded. The flag is used
      // to suppress the mainDate handoff snapshot.
      if (
        !stragglerDetected &&
        lastInSequenceGroupIds.has(groupId) &&
        plannedEnd !== null &&
        date > plannedEnd &&
        percentCompleted >= inputs.cascadeThreshold
      ) {
        stragglerDetected = true;
      }
    }

    // Add mainDate handoff snapshot — only if the group still has an active pool
    // AND was not identified as a straggler during the crawl.
    if (activePool > 0 && !stragglerDetected) {
      const finalCompleted = totalPool - activePool;
      snapshots.push({
        date: mainDate,
        completed: finalCompleted,
        remaining: activePool,
        priceCompleted: 0,
        priceForecasted: 0,
        employeesWorking: [],
        percentCompleted: totalPool > 0 ? finalCompleted / totalPool : 0,
      });
    }

    return snapshots;
  }

  // Initialize GroupPoolState for each group
  const poolStates = new Map<string, GroupPoolState>();

  for (const context of groupContexts) {
    const { groupId } = context;
    const activePool = activePoolByGroup.get(groupId) ?? 0;
    const totalPool = totalPoolByGroup.get(groupId) ?? 0;
    const stats = groupProductionStats.get(groupId);
    const poolHistory = buildPastPoolHistory(groupId, activePool, totalPool, context.plannedEnd);

    // If the pool is already fully drained as of mainDate, find the date it first hit zero
    // so the future phase doesn't need to drain it to record a projectedEndDate.
    let pastProjectedEndDate: string | null = null;
    if (activePool === 0 && poolHistory.length > 0) {
      const firstZeroSnapshot = poolHistory.find((s) => s.remaining === 0);
      pastProjectedEndDate = firstZeroSnapshot?.date ?? mainDate;
    }

    poolStates.set(groupId, {
      groupId,
      poolRemaining: activePool,
      totalPool,
      completedSoFar: totalPool - activePool,
      productionDays: stats?.actualDaysWorked ?? 0,
      productionSum: stats?.actualPriceCompleted ?? 0,
      projectedEndDate: pastProjectedEndDate,
      projectedStartDate: null,
      poolHistory,
      overdueAsOfMainDate:
        context.plannedEnd !== null && context.plannedEnd < mainDate && activePool > 0,
    });
  }

  return { poolStates, servCodeToGroupId, groupProductionStats };
}
