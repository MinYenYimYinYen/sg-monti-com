import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import {
  CSP,
  CSPOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import {
  NULL_PROGRAM_TYPE_KEY,
  LookbackStats,
  accumulateDailyProduction,
  computeLookbackStats,
  getValidProductionDates,
  getServiceEffectiveDate,
} from "@/app/bizPlan/paceCrawler/_lib/employeeLookbackUtils";
import {
  LookbackConfig,
  DEFAULT_LOOKBACK_CONFIG,
} from "@/app/bizPlan/paceCrawler/_lib/lookbackConfig";

// ---------------------------------------------------------------------------
// Default config (no UI yet — use constant defaults instead of Redux state)
// ---------------------------------------------------------------------------

const selectLookbackConfig = (_state: AppState): LookbackConfig =>
  DEFAULT_LOOKBACK_CONFIG;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EmployeeLookbackMap = Map<string, Map<string, LookbackStats | null>>;

// Filters the full service list to only those within the lookback window.
function filterServicesToLookbackWindow(
  allServices: ReturnType<typeof deepSelect.servCodes>[number]["services"],
  lookbackStart: string,
) {
  return allServices.filter((s) => {
    if (s.status === "S" && s.production?.doneDate != null) {
      return s.production.doneDate >= lookbackStart;
    }
    if (s.status === "$" && s.lastAssigned.schedDate != null) {
      return s.lastAssigned.schedDate >= lookbackStart;
    }
    return false;
  });
}

// Builds a map of employeeId → average daily CSP across all programTypes in the window.
function buildTotalAvgByEmployee(
  windowServices: ReturnType<typeof filterServicesToLookbackWindow>,
  validDates: Set<string>,
): Map<string, CSP> {
  const totalAccumulator = new Map<string, Map<string, CSP>>();

  for (const service of windowServices) {
    const effectiveDate = getServiceEffectiveDate(service);
    if (!effectiveDate || !validDates.has(effectiveDate)) continue;

    const serviceCSP = CSPOps.fromService(service);

    if (service.status === "S" && service.production?.doneBys) {
      for (const doneBy of service.production.doneBys) {
        const employeeId = doneBy.employeeId;
        const contribution = CSPOps.multiply(serviceCSP, doneBy.percent);
        if (!totalAccumulator.has(employeeId))
          totalAccumulator.set(employeeId, new Map());
        const byDate = totalAccumulator.get(employeeId)!;
        const existing = byDate.get(effectiveDate) ?? { ...baseCountSizePrice };
        byDate.set(effectiveDate, CSPOps.sum(existing, contribution));
      }
    } else if (service.status === "$" && service.lastAssigned.employeeId) {
      const employeeId = service.lastAssigned.employeeId;
      if (!totalAccumulator.has(employeeId))
        totalAccumulator.set(employeeId, new Map());
      const byDate = totalAccumulator.get(employeeId)!;
      const existing = byDate.get(effectiveDate) ?? { ...baseCountSizePrice };
      byDate.set(effectiveDate, CSPOps.sum(existing, serviceCSP));
    }
  }

  const totalAvgByEmployee = new Map<string, CSP>();
  for (const [employeeId, byDate] of totalAccumulator) {
    const dailyTotals = Array.from(byDate.values());
    const totalSum = CSPOps.sumAll(dailyTotals);
    totalAvgByEmployee.set(
      employeeId,
      CSPOps.divideBy(totalSum, dailyTotals.length),
    );
  }
  return totalAvgByEmployee;
}

// ---------------------------------------------------------------------------
// Selector
// ---------------------------------------------------------------------------

const selectEmployeeLookbackMap = createSelector(
  [deepSelect.servCodes, selectLookbackConfig],
  (servCodes, lookbackConfig): EmployeeLookbackMap => {
    const allServices = servCodes.flatMap((sc) => sc.services);
    const windowServices = filterServicesToLookbackWindow(
      allServices,
      lookbackConfig.lookbackStart,
    );

    const validDates = getValidProductionDates(
      windowServices,
      lookbackConfig.completionThreshold,
    );
    const rawAccumulation = accumulateDailyProduction(windowServices, validDates);
    const totalAvgByEmployee = buildTotalAvgByEmployee(windowServices, validDates);

    const result: EmployeeLookbackMap = new Map();
    for (const [employeeId, byProgramType] of rawAccumulation) {
      const totalAvgDailyCSP =
        totalAvgByEmployee.get(employeeId) ?? { ...baseCountSizePrice };
      const statsMap = new Map<string, LookbackStats | null>();
      for (const [programTypeKey, dailyProductions] of byProgramType) {
        statsMap.set(
          programTypeKey,
          computeLookbackStats(dailyProductions, totalAvgDailyCSP),
        );
      }
      result.set(employeeId, statsMap);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export { NULL_PROGRAM_TYPE_KEY };
export type { EmployeeLookbackMap, LookbackStats };

export const paceCrawlerLookbackSelect = {
  employeeLookbackMap: selectEmployeeLookbackMap,
};
