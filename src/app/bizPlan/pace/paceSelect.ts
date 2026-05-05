import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  EmployeeAllocation,
  EmployeePaceSummary,
  EmployeeShare,
  LookbackConfig,
  PaceCategory,
  ProgCodePace,
  ServCodePace,
} from "@/app/bizPlan/pace/PaceType";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppState } from "@/store";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import {
  NULL_PROGRAM_TYPE_KEY,
  LookbackStats,
  accumulateDailyProduction,
  computeLookbackStats,
  getValidProductionDates,
} from "@/app/bizPlan/pace/_lib/employeeLookbackUtils";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

function getCategory(servCode: ServCodeDeep): PaceCategory {
  if (servCode.alwaysAsap) return "asap";
  if (!dateRanges.isValidDateRange(servCode.dateRange)) return "notSet";
  const today = dateStrings.today();
  if (today < servCode.dateRange.min) return "notStarted";
  if (today > servCode.dateRange.max) return "overdue";
  return "inProgress";
}

function getCSPTotal(services: Service[]) {
  const csps = services.map((s) => CountSizePriceOps.fromService(s));
  return CountSizePriceOps.sumAll(csps);
}

const CATEGORY_URGENCY: Record<PaceCategory, number> = {
  asap: 0,
  overdue: 1,
  inProgress: 2,
  notStarted: 3,
  notSet: 4,
};

function mostUrgentCategory(categories: PaceCategory[]): PaceCategory {
  return categories.reduce((best, c) =>
    CATEGORY_URGENCY[c] < CATEGORY_URGENCY[best] ? c : best,
  );
}

function safeDivideCSP(
  numerator: CountSizePrice,
  denominator: CountSizePrice,
): CountSizePrice | null {
  if (
    denominator.count === 0 &&
    denominator.size === 0 &&
    denominator.price === 0 &&
    denominator.rev === 0
  ) {
    return null;
  }
  return {
    count: denominator.count !== 0 ? numerator.count / denominator.count : 0,
    size: denominator.size !== 0 ? numerator.size / denominator.size : 0,
    price: denominator.price !== 0 ? numerator.price / denominator.price : 0,
    rev: denominator.rev !== 0 ? numerator.rev / denominator.rev : 0,
  };
}

function minCSP(a: CountSizePrice, b: CountSizePrice): CountSizePrice {
  return {
    count: Math.min(a.count, b.count),
    size: Math.min(a.size, b.size),
    price: Math.min(a.price, b.price),
    rev: Math.min(a.rev, b.rev),
  };
}

// Slice Selectors
const selectSortMode = (state: AppState) => state.pace.sortMode;
const selectActiveFilters = (state: AppState) => state.pace.activeFilters;
const selectUnfinishedOnly = (state: AppState) => state.pace.unfinishedOnly;
const selectSelectedServCodeIds = (state: AppState) =>
  state.pace.selectedServCodeIds;
const selectSelectedProgCodeId = (state: AppState) =>
  state.pace.selectedProgCodeId;
const selectSelectionSource = (state: AppState) => state.pace.selectionSource;
const selectLookbackConfig = (state: AppState): LookbackConfig =>
  state.pace.lookbackConfig;

// Computes the lookback map: employeeId → programTypeKey → LookbackStats | null
type EmployeeLookbackMap = Map<
  string,
  Map<string, LookbackStats | null>
>;

const selectEmployeeLookbackMap = createSelector(
  [deepSelect.servCodes, selectLookbackConfig],
  (servCodes, lookbackConfig): EmployeeLookbackMap => {
    // Collect all services within the lookback window
    const allServices = servCodes.flatMap((sc) => sc.services);
    const windowServices = allServices.filter(
      (s) =>
        s.production?.doneDate != null &&
        s.production.doneDate >= lookbackConfig.lookbackStart,
    );

    const validDates = getValidProductionDates(
      windowServices,
      lookbackConfig.completionThreshold,
    );
    const rawAccumulation = accumulateDailyProduction(windowServices, validDates);

    // Re-derive total daily CSP per employee directly from windowServices
    // (avoids needing to re-key the already-flattened arrays by date)
    const totalAccumulator = new Map<string, Map<string, CountSizePrice>>();
    for (const service of windowServices) {
      if (service.status !== "S" || !service.production?.doneDate) continue;
      if (!validDates.has(service.production.doneDate)) continue;
      const serviceCSP = CountSizePriceOps.fromService(service);
      const date = service.production.doneDate;
      for (const doneBy of service.production.doneBys) {
        const employeeId = doneBy.employeeId;
        const contribution = CountSizePriceOps.multiply(serviceCSP, doneBy.percent);
        if (!totalAccumulator.has(employeeId)) {
          totalAccumulator.set(employeeId, new Map());
        }
        const byDate = totalAccumulator.get(employeeId)!;
        const existing = byDate.get(date) ?? { ...baseCountSizePrice };
        byDate.set(date, CountSizePriceOps.sum(existing, contribution));
      }
    }

    // Compute totalMaxDailyCSP and totalAvgDailyCSP per employee (across all programTypes)
    const totalMaxByEmployee = new Map<string, CountSizePrice>();
    const totalAvgByEmployee = new Map<string, CountSizePrice>();
    for (const [employeeId, byDate] of totalAccumulator) {
      const dailyTotals = Array.from(byDate.values());
      const totalMax = dailyTotals.reduce(
        (max, day) => ({
          count: Math.max(max.count, day.count),
          size: Math.max(max.size, day.size),
          price: Math.max(max.price, day.price),
          rev: Math.max(max.rev, day.rev),
        }),
        { ...baseCountSizePrice },
      );
      totalMaxByEmployee.set(employeeId, totalMax);

      const totalSum = CountSizePriceOps.sumAll(dailyTotals);
      totalAvgByEmployee.set(
        employeeId,
        CountSizePriceOps.divideBy(totalSum, dailyTotals.length),
      );
    }

    const result: EmployeeLookbackMap = new Map();
    for (const [employeeId, byProgramType] of rawAccumulation) {
      const totalMaxDailyCSP =
        totalMaxByEmployee.get(employeeId) ?? { ...baseCountSizePrice };
      const totalAvgDailyCSP =
        totalAvgByEmployee.get(employeeId) ?? { ...baseCountSizePrice };
      const statsMap = new Map<string, LookbackStats | null>();
      for (const [programTypeKey, dailyProductions] of byProgramType) {
        statsMap.set(
          programTypeKey,
          computeLookbackStats(dailyProductions, totalMaxDailyCSP, totalAvgDailyCSP),
        );
      }
      result.set(employeeId, statsMap);
    }
    return result;
  },
);

// Per-employee remaining capacity tracker (mutable, used within selectServCodePaces)
// Key: employeeId, Value: remaining CountSizePrice capacity
type CapacityTracker = Map<string, CountSizePrice>;

const selectServCodePaces = createSelector(
  [deepSelect.servCodes, selectEmployeeLookbackMap, employeeSelect.employeeMap],
  (servCodes, lookbackMap, employeeMap) => {
    // Build a map of servCodeId → unfinishedRate for cascade allocation
    const unfinishedRateMap = new Map<string, CountSizePrice>();
    for (const servCode of servCodes) {
      const unfinished = servCode.services.filter((s) =>
        getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
      );
      const unfinishedCSP = getCSPTotal(unfinished);
      const unfinishedRate = CountSizePriceOps.divideBy(
        unfinishedCSP,
        servCode.x.daysRemaining,
      );
      unfinishedRateMap.set(servCode.servCodeId, unfinishedRate);
    }

    // Run the cascade per employee in their priority order (employee.servCodeIds[])
    // This ensures capacity is allocated to higher-priority servCodes first.
    const remainingCapacity: CapacityTracker = new Map();
    // employeeId → servCodeId → EmployeeShare (built during cascade)
    const sharesByEmployeeAndServCode = new Map<string, Map<string, EmployeeShare>>();

    for (const employee of employeeMap.values()) {
      const employeeLookback = lookbackMap.get(employee.employeeId);

      for (const servCodeId of employee.servCodeIds) {
        const servCode = servCodes.find((sc) => sc.servCodeId === servCodeId);
        if (!servCode) continue;

        const unfinishedRate = unfinishedRateMap.get(servCodeId) ?? { ...baseCountSizePrice };

        // Look up stats using this servCode's specific program type
        const programTypeKey = servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
        const employeeStats = employeeLookback?.get(programTypeKey) ?? null;

        if (!employeeStats) {
          // No lookback data for this program type — even-split fallback
          const assignedCount = servCode.assignedTo.length || 1;
          const evenSplit = CountSizePriceOps.divideBy(unfinishedRate, assignedCount);
          const share: EmployeeShare = {
            employee,
            expectedCSP: evenSplit,
            maxDailyCSP: null,
            avgDailyCSP: null,
            fractionConsumed: null,
            isEstimated: true,
          };
          if (!sharesByEmployeeAndServCode.has(employee.employeeId)) {
            sharesByEmployeeAndServCode.set(employee.employeeId, new Map());
          }
          sharesByEmployeeAndServCode.get(employee.employeeId)!.set(servCodeId, share);
          continue;
        }

        const { maxDailyCSP, avgDailyCSP, totalMaxDailyCSP, totalAvgDailyCSP } = employeeStats;

        // Initialize remaining capacity from totalAvgDailyCSP (cross-programType ceiling).
        // Avg is used instead of max because totalMaxDailyCSP is a per-dimension phantom —
        // each dimension independently takes its best day, so the combined value was never
        // actually achieved. Avg reflects a realistic typical day.
        if (!remainingCapacity.has(employee.employeeId)) {
          remainingCapacity.set(employee.employeeId, { ...totalAvgDailyCSP });
        }
        const remaining = remainingCapacity.get(employee.employeeId)!;

        // Divide demand equally among all assigned employees before capping by capacity
        const assignedCount = servCode.assignedTo.length || 1;
        const perEmployeeRate = CountSizePriceOps.divideBy(unfinishedRate, assignedCount);

        // Allocate: min(remaining, this employee's share of the servCode demand)
        const expectedCSP = minCSP(remaining, perEmployeeRate);

        // Deduct from remaining capacity
        remainingCapacity.set(
          employee.employeeId,
          CountSizePriceOps.subtract(remaining, expectedCSP),
        );

        // fractionConsumed denominator is totalAvgDailyCSP — "fraction of a typical day"
        const fractionConsumed = safeDivideCSP(expectedCSP, totalAvgDailyCSP);

        const share: EmployeeShare = {
          employee,
          expectedCSP,
          maxDailyCSP,
          avgDailyCSP,
          fractionConsumed,
          isEstimated: false,
        };

        if (!sharesByEmployeeAndServCode.has(employee.employeeId)) {
          sharesByEmployeeAndServCode.set(employee.employeeId, new Map());
        }
        sharesByEmployeeAndServCode.get(employee.employeeId)!.set(servCodeId, share);
      }
    }

    // Now build ServCodePace[] using the pre-computed shares
    return servCodes.map((servCode) => {
      const finished = servCode.services.filter((s) => s.status === "S");
      const finishedCSP = getCSPTotal(finished);
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        servCode.x.daysElapsed,
      );

      const unfinishedRate = unfinishedRateMap.get(servCode.servCodeId) ?? { ...baseCountSizePrice };
      const unfinishedCSP = getCSPTotal(
        servCode.services.filter((s) =>
          getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
        ),
      );

      const employeeShares: EmployeeShare[] = servCode.assignedTo.map((employee) => {
        const share = sharesByEmployeeAndServCode
          .get(employee.employeeId)
          ?.get(servCode.servCodeId);

        if (share) return share;

        // Fallback: employee assigned but not in their priority list yet (shouldn't happen)
        return {
          employee,
          expectedCSP: { ...baseCountSizePrice },
          maxDailyCSP: null,
          avgDailyCSP: null,
          fractionConsumed: null,
          isEstimated: true,
        };
      });

      const teamExpectedCSP = CountSizePriceOps.sumAll(
        employeeShares.map((s) => s.expectedCSP ?? { ...baseCountSizePrice }),
      );
      const paceDelta = CountSizePriceOps.subtract(teamExpectedCSP, unfinishedRate);
      const paceDeltaPct = safeDivideCSP(paceDelta, unfinishedRate);

      const pace: ServCodePace = {
        servCode,
        daysRemaining: servCode.x.daysRemaining,
        category: getCategory(servCode),
        unfinishedCSP,
        unfinishedRate,
        finishedCSP,
        finishedRate,
        employeeShares,
        teamExpectedCSP,
        paceDelta,
        paceDeltaPct,
      };
      return pace;
    });
  },
);

const selectServCodePaceMap = createSelector([selectServCodePaces], (paces) =>
  new Grouper(paces).toUniqueMap((p) => p.servCode.servCodeId),
);

const selectProgCodePaces = createSelector(
  [progServSelect.progCodes, selectServCodePaceMap],
  (progCodes, paceMap) => {
    const progCodePaces: ProgCodePace[] = progCodes.map((progCode) => {
      const servCodePacesMaybe = progCode.servCodes.map((sc) =>
        paceMap.get(sc.servCodeId),
      );
      const servCodePaces = typeGuard.definedArray(servCodePacesMaybe);

      const category: PaceCategory =
        servCodePaces.length > 0
          ? mostUrgentCategory(servCodePaces.map((p) => p.category))
          : "notSet";

      const unfinishedCSP = CountSizePriceOps.sumAll(
        servCodePaces.map((p) => p.unfinishedCSP),
      );
      const finishedCSP = CountSizePriceOps.sumAll(
        servCodePaces.map((p) => p.finishedCSP),
      );
      return {
        progCode,
        servCodePaces,
        category,
        unfinishedCSP,
        finishedCSP,
      };
    });
    return progCodePaces;
  },
);

const selectFilteredSortedProgCodePaces = createSelector(
  [
    selectProgCodePaces,
    selectSortMode,
    selectActiveFilters,
    selectUnfinishedOnly,
  ],
  (progCodePaces, sortMode, activeFilters, unfinishedOnly): ProgCodePace[] => {
    const filtered = progCodePaces.filter((p) => {
      const hasMatchingCategory = p.servCodePaces.some((sp) =>
        activeFilters.includes(sp.category),
      );
      if (!hasMatchingCategory) return false;
      if (unfinishedOnly && p.unfinishedCSP.count === 0) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "byId") {
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      // byDateRange: most urgent first, then earliest dateRange.min, then alphabetical
      const urgencyA = CATEGORY_URGENCY[a.category];
      const urgencyB = CATEGORY_URGENCY[b.category];
      if (urgencyA !== urgencyB) return urgencyA - urgencyB;

      const minA =
        a.servCodePaces
          .map((p) => p.servCode.dateRange.min ?? "")
          .filter(Boolean)
          .sort()[0] ?? "";
      const minB =
        b.servCodePaces
          .map((p) => p.servCode.dateRange.min ?? "")
          .filter(Boolean)
          .sort()[0] ?? "";
      if (minA !== minB) return minA.localeCompare(minB);

      return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
    });
  },
);

// "Active" = inProgress + asap + overdue — all categories that need attention now
const selectActiveServCodeIds = createSelector(
  [selectServCodePaces],
  (paces) =>
    paces
      .filter(
        (p) =>
          p.category === "inProgress" ||
          p.category === "asap" ||
          p.category === "overdue",
      )
      .map((p) => p.servCode.servCodeId),
);

const selectSelectedPaces = createSelector(
  [selectServCodePaceMap, selectSelectedServCodeIds],
  (paceMap, ids) => {
    const selectedPacesMaybe = ids.map((id) => paceMap.get(id));
    return typeGuard.definedArray(selectedPacesMaybe);
  },
);

// Cross-servCode capacity summary per employee
const selectEmployeePaceSummaries = createSelector(
  [selectServCodePaces, selectEmployeeLookbackMap, assignmentPlanSelect.assignmentsByEmployeeId],
  (servCodePaces, lookbackMap, assignmentsByEmployeeId): EmployeePaceSummary[] => {
    // Group all EmployeeShare entries by employeeId
    const byEmployee = new Map<
      string,
      { shares: EmployeeShare[]; servCodePaces: ServCodePace[] }
    >();

    for (const pace of servCodePaces) {
      for (const share of pace.employeeShares) {
        const employeeId = share.employee.employeeId;
        if (!byEmployee.has(employeeId)) {
          byEmployee.set(employeeId, { shares: [], servCodePaces: [] });
        }
        const entry = byEmployee.get(employeeId)!;
        entry.shares.push(share);
        entry.servCodePaces.push(pace);
      }
    }

    const summaries: EmployeePaceSummary[] = [];

    for (const [employeeId, { shares, servCodePaces: employeePaces }] of byEmployee) {
      const employee = shares[0].employee;
      const employeeLookback = lookbackMap.get(employeeId);
      const priorityOrder = assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      // Group shares by programType — one summary per (employee, programType)
      const byProgramType = new Map<string, { shares: EmployeeShare[]; paces: ServCodePace[] }>();
      for (let i = 0; i < shares.length; i++) {
        const key = employeePaces[i].servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
        if (!byProgramType.has(key)) byProgramType.set(key, { shares: [], paces: [] });
        const group = byProgramType.get(key)!;
        group.shares.push(shares[i]);
        group.paces.push(employeePaces[i]);
      }

      for (const [programTypeKey, group] of byProgramType) {
        const programType = programTypeKey === NULL_PROGRAM_TYPE_KEY ? null : programTypeKey;
        const stats = employeeLookback?.get(programTypeKey) ?? null;

        const unsortedAllocations: EmployeeAllocation[] = group.shares.map((share, i) => ({
          servCode: group.paces[i].servCode,
          fractionConsumed: share.fractionConsumed,
          expectedCSP: share.expectedCSP ?? { ...baseCountSizePrice },
        }));

        // Sort allocations by the manager's priority order
        const allocations = [...unsortedAllocations].sort((a, b) => {
          const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
          const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
          return ia - ib;
        });

        const fractionConsumedValues = allocations
          .map((a) => a.fractionConsumed)
          .filter((f): f is CountSizePrice => f !== null);

        const totalFractionConsumed =
          fractionConsumedValues.length > 0
            ? CountSizePriceOps.sumAll(fractionConsumedValues)
            : null;

        const freeCapacityFraction = totalFractionConsumed
          ? {
              count: Math.max(0, 1 - totalFractionConsumed.count),
              size: Math.max(0, 1 - totalFractionConsumed.size),
              price: Math.max(0, 1 - totalFractionConsumed.price),
              rev: Math.max(0, 1 - totalFractionConsumed.rev),
            }
          : null;

        const isOverloaded = totalFractionConsumed
          ? totalFractionConsumed.count > 1 ||
            totalFractionConsumed.size > 1 ||
            totalFractionConsumed.price > 1 ||
            totalFractionConsumed.rev > 1
          : false;

        summaries.push({
          employee,
          programType,
          maxDailyCSP: stats?.maxDailyCSP ?? null,
          avgDailyCSP: stats?.avgDailyCSP ?? null,
          totalMaxDailyCSP: stats?.totalMaxDailyCSP ?? null,
          totalAvgDailyCSP: stats?.totalAvgDailyCSP ?? null,
          allocations,
          totalFractionConsumed,
          freeCapacityFraction,
          isOverloaded,
        });
      }
    }

    return summaries;
  },
);

export const paceSelect = {
  servCodePaces: selectServCodePaces,
  servCodePaceMap: selectServCodePaceMap,
  progCodePaces: selectProgCodePaces,
  filteredSortedProgCodePaces: selectFilteredSortedProgCodePaces,
  activeServCodeIds: selectActiveServCodeIds,
  selectedPaces: selectSelectedPaces,
  selectedServCodeIds: selectSelectedServCodeIds,
  selectionSource: selectSelectionSource,
  selectedProgCodeId: selectSelectedProgCodeId,
  sortMode: selectSortMode,
  activeFilters: selectActiveFilters,
  unfinishedOnly: selectUnfinishedOnly,
  lookbackConfig: selectLookbackConfig,
  employeeLookbackMap: selectEmployeeLookbackMap,
  employeePaceSummaries: selectEmployeePaceSummaries,
};
