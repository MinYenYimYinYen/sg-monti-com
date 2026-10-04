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

  // Build pool history for past days.
  // We record one snapshot per production day (days with actual work).
  // The mainDate snapshot is the handoff point.
  function buildPastPoolHistory(
    groupId: string,
    activePool: number,
    totalPool: number,
  ): PoolDaySnapshot[] {
    const stats = groupProductionStats.get(groupId);

    // Collect all unique dates across all employees for this group
    const byEmployeeByDate = productionByGroupByEmployeeByDate.get(groupId);
    if (!byEmployeeByDate || byEmployeeByDate.size === 0 || !stats) {
      return [{ date: mainDate, completed: totalPool - activePool, remaining: activePool }];
    }

    // Merge all employee dates into a single date → total map
    const byDate = new Map<string, number>();
    for (const employeeDates of byEmployeeByDate.values()) {
      for (const [date, dailyPrice] of employeeDates) {
        byDate.set(date, (byDate.get(date) ?? 0) + dailyPrice);
      }
    }

    const sortedDates = [...byDate.keys()].sort();
    const snapshots: PoolDaySnapshot[] = [];
    let cumulativeCompleted = 0;

    for (const date of sortedDates) {
      cumulativeCompleted += byDate.get(date)!;
      const remaining = Math.max(0, totalPool - cumulativeCompleted);
      snapshots.push({ date, completed: cumulativeCompleted, remaining });
    }

    // Add mainDate handoff snapshot
    const finalCompleted = totalPool - activePool;
    snapshots.push({ date: mainDate, completed: finalCompleted, remaining: activePool });

    return snapshots;
  }

  // Initialize GroupPoolState for each group
  const poolStates = new Map<string, GroupPoolState>();

  for (const context of groupContexts) {
    const { groupId } = context;
    const activePool = activePoolByGroup.get(groupId) ?? 0;
    const totalPool = totalPoolByGroup.get(groupId) ?? 0;
    const stats = groupProductionStats.get(groupId);

    poolStates.set(groupId, {
      groupId,
      poolRemaining: activePool,
      totalPool,
      completedSoFar: totalPool - activePool,
      productionDays: stats?.actualDaysWorked ?? 0,
      productionSum: stats?.actualPriceCompleted ?? 0,
      projectedEndDate: null,
      projectedStartDate: null,
      poolHistory: buildPastPoolHistory(groupId, activePool, totalPool),
    });
  }

  return { poolStates, servCodeToGroupId, groupProductionStats };
}
