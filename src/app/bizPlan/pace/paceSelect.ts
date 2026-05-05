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

    const result: EmployeeLookbackMap = new Map();
    for (const [employeeId, byProgramType] of rawAccumulation) {
      const statsMap = new Map<string, LookbackStats | null>();
      for (const [programTypeKey, dailyProductions] of byProgramType) {
        statsMap.set(programTypeKey, computeLookbackStats(dailyProductions));
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
  [deepSelect.servCodes, selectEmployeeLookbackMap],
  (servCodes, lookbackMap) => {
    // Track remaining capacity per employee across all servCodes (cascade model)
    const remainingCapacity: CapacityTracker = new Map();

    return servCodes.map((servCode) => {
      const finished = servCode.services.filter((s) => s.status === "S");
      const finishedCSP = getCSPTotal(finished);
      const finishedRate = CountSizePriceOps.divideBy(
        finishedCSP,
        servCode.x.daysElapsed,
      );

      const unfinished = servCode.services.filter((s) =>
        getServiceStatuses(["printed", "active", "asap"]).includes(s.status),
      );
      const unfinishedCSP = getCSPTotal(unfinished);
      const unfinishedRate = CountSizePriceOps.divideBy(
        unfinishedCSP,
        servCode.x.daysRemaining,
      );

      const programTypeKey =
        servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;

      const employeeShares: EmployeeShare[] = servCode.assignedTo.map(
        (employee) => {
          const employeeStats = lookbackMap
            .get(employee.employeeId)
            ?.get(programTypeKey);

          if (!employeeStats) {
            // No lookback data — even-split fallback
            const evenSplit = CountSizePriceOps.divideBy(
              unfinishedRate,
              servCode.assignedTo.length || 1,
            );
            return {
              employee,
              expectedCSP: evenSplit,
              maxDailyCSP: null,
              avgDailyCSP: null,
              fractionConsumed: null,
              isEstimated: true,
            };
          }

          const { maxDailyCSP, avgDailyCSP } = employeeStats;

          // Initialize remaining capacity for this employee if not yet tracked
          if (!remainingCapacity.has(employee.employeeId)) {
            remainingCapacity.set(employee.employeeId, { ...maxDailyCSP });
          }
          const remaining = remainingCapacity.get(employee.employeeId)!;

          // Allocate: min(remaining, what this servCode needs)
          const expectedCSP = minCSP(remaining, unfinishedRate);

          // Deduct from remaining capacity
          remainingCapacity.set(
            employee.employeeId,
            CountSizePriceOps.subtract(remaining, expectedCSP),
          );

          const fractionConsumed = safeDivideCSP(expectedCSP, maxDailyCSP);

          return {
            employee,
            expectedCSP,
            maxDailyCSP,
            avgDailyCSP,
            fractionConsumed,
            isEstimated: false,
          };
        },
      );

      const teamExpectedCSP = CountSizePriceOps.sumAll(
        employeeShares.map(
          (s) => s.expectedCSP ?? { ...baseCountSizePrice },
        ),
      );
      const paceDelta = CountSizePriceOps.subtract(
        teamExpectedCSP,
        unfinishedRate,
      );
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
  [selectServCodePaces, selectEmployeeLookbackMap],
  (servCodePaces, lookbackMap): EmployeePaceSummary[] => {
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

      // Use the programType from the first servCode (employees typically work one programType)
      const programType =
        employeePaces[0]?.servCode.progCode.programType ?? null;
      const programTypeKey = programType ?? NULL_PROGRAM_TYPE_KEY;

      const stats =
        lookbackMap.get(employeeId)?.get(programTypeKey) ?? null;

      const allocations: EmployeeAllocation[] = shares.map((share, i) => ({
        servCode: employeePaces[i].servCode,
        fractionConsumed: share.fractionConsumed,
        expectedCSP: share.expectedCSP ?? { ...baseCountSizePrice },
      }));

      // Sum fractionConsumed across all allocations
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
        allocations,
        totalFractionConsumed,
        freeCapacityFraction,
        isOverloaded,
      });
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
