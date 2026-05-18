import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { MatrixDisplayConfig } from "@/app/bizPlan/pace/slices/paceSlice";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/selectors/rawPaceSelect";
import {
  CSP,
  CSPOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  ServCodePaceDelta,
  ProgCodeProjectedCompletion,
  SeasonOptimizedRange,
} from "@/app/bizPlan/pace/PaceTypes";

// ---------------------------------------------------------------------------
// Slice selectors
// ---------------------------------------------------------------------------

const selectMatrixDisplayConfig = (state: AppState): MatrixDisplayConfig =>
  state.pace.matrixDisplayConfig;

const selectSeasonOptimizerConfig = (state: AppState) => state.pace.seasonOptimizerConfig;

// ---------------------------------------------------------------------------
// Layer 5 — Delta Projection (shared pool drain)
// ---------------------------------------------------------------------------

// Simulates draining a single-dimension pool across time intervals with staggered employee availability.
// Returns the date when the pool is exhausted, or null if no employees are available.
function computePoolDrainDate(
  employeeAvailability: { availableFrom: string; rate: number; alreadyCommitted: number }[],
  pool: number,
  projectionStart: string,
  closeDate: string,
): string | null {
  // Subtract work already committed pre-interruption from the pool before simulating.
  const totalCommitted = employeeAvailability.reduce((s, e) => s + e.alreadyCommitted, 0);
  const effectivePool = pool - totalCommitted;
  if (effectivePool <= 0) return projectionStart;
  if (employeeAvailability.length === 0) return null;

  const boundarySet = new Set<string>([projectionStart, closeDate]);
  for (const { availableFrom } of employeeAvailability) {
    if (availableFrom >= projectionStart) boundarySet.add(availableFrom);
  }
  const boundaries = [...boundarySet].sort();

  let remaining = effectivePool;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const intervalStart = boundaries[i];
    const intervalEnd = boundaries[i + 1];

    let intervalRate = 0;
    for (const { availableFrom, rate } of employeeAvailability) {
      if (availableFrom <= intervalStart) intervalRate += rate;
    }

    if (intervalRate <= 0) continue;

    const intervalWeekdays = Math.max(
      0,
      dateRanges.countWeekdays({ min: intervalStart, max: intervalEnd }) - 1,
    );
    if (intervalWeekdays <= 0) continue;

    const produced = intervalRate * intervalWeekdays;

    if (produced >= remaining) {
      const daysNeeded = remaining / intervalRate;
      return dateStrings.addWeekdays(intervalStart, daysNeeded);
    }

    remaining -= produced;
  }

  // Pool not exhausted within the window — project beyond deadline
  let finalRate = 0;
  for (const { availableFrom, rate } of employeeAvailability) {
    if (availableFrom <= closeDate) finalRate += rate;
  }
  if (finalRate <= 0) return null;

  const daysNeeded = remaining / finalRate;
  return dateStrings.addWeekdays(closeDate, daysNeeded);
}

type DimensionAvailability = { availableFrom: string; rate: number; alreadyCommitted: number }[];

// Builds per-dimension employee availability lists for a servCode's assigned employees.
// `alreadyCommitted` carries the work the employee completed on this servCode before a
// higher-priority servCode preempted them, so the pool drain simulation starts from the
// correct remaining balance rather than the full pool share.
function buildDimensionAvailability(
  servCode: { assignedTo: { employeeId: string }[] },
  servCodeId: string,
  openDate: string,
  cascadeMap: ReturnType<typeof cascadeSelect.employeeCascadeMap>,
): { count: DimensionAvailability; size: DimensionAvailability; price: DimensionAvailability } {
  const availabilityCount: DimensionAvailability = [];
  const availabilitySize: DimensionAvailability = [];
  const availabilityPrice: DimensionAvailability = [];

  for (const employee of servCode.assignedTo) {
    const cascadeResult = cascadeMap.get(employee.employeeId);
    const entry = cascadeResult?.byServCode.get(servCodeId);
    if (!entry) continue;

    const availFrom = entry.availableFrom ?? openDate;

    // Only count contributedCSP as pre-committed when the employee was actually interrupted
    // (availableFrom is after openDate). If availableFrom <= openDate, the employee was never
    // pulled away — contributedCSP is their future work, not already-banked work.
    const wasInterrupted = availFrom > openDate;
    if (entry.dailyRate.count > 0)
      availabilityCount.push({ availableFrom: availFrom, rate: entry.dailyRate.count, alreadyCommitted: wasInterrupted ? entry.contributedCSP.count : 0 });
    if (entry.dailyRate.size > 0)
      availabilitySize.push({ availableFrom: availFrom, rate: entry.dailyRate.size, alreadyCommitted: wasInterrupted ? entry.contributedCSP.size : 0 });
    if (entry.dailyRate.price > 0)
      availabilityPrice.push({ availableFrom: availFrom, rate: entry.dailyRate.price, alreadyCommitted: wasInterrupted ? entry.contributedCSP.price : 0 });
  }

  return { count: availabilityCount, size: availabilitySize, price: availabilityPrice };
}

// Computes the per-dimension delta days (projected end date vs close date) for a servCode.
function computeDeltaDaysCSP(
  availability: { count: DimensionAvailability; size: DimensionAvailability; price: DimensionAvailability },
  pool: CSP,
  openDate: string,
  closeDate: string,
): { count: number | null; size: number | null; price: number | null } {
  const projectedEndCount = computePoolDrainDate(availability.count, pool.count, openDate, closeDate);
  const projectedEndSize = computePoolDrainDate(availability.size, pool.size, openDate, closeDate);
  const projectedEndPrice = computePoolDrainDate(availability.price, pool.price, openDate, closeDate);

  return {
    count: projectedEndCount != null && pool.count > 0
      ? dateRanges.weekdaysBetween(closeDate, projectedEndCount)
      : null,
    size: projectedEndSize != null && pool.size > 0
      ? dateRanges.weekdaysBetween(closeDate, projectedEndSize)
      : null,
    price: projectedEndPrice != null && pool.price > 0
      ? dateRanges.weekdaysBetween(closeDate, projectedEndPrice)
      : null,
  };
}

const selectServCodePaceDeltaMap = createSelector(
  [
    servCodePaceSelect.servCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    cascadeSelect.employeeCascadeMap,
  ],
  (servCodePaces, perDayMap, cascadeMap): Map<string, ServCodePaceDelta> => {
    const today = dateStrings.today();
    const result = new Map<string, ServCodePaceDelta>();

    for (const pace of servCodePaces) {
      const { servCode } = pace;
      const servCodeId = servCode.servCodeId;
      const dateRange = servCode.dateRange;
      const perDay = perDayMap.get(servCodeId);

      if (!perDay || (!servCode.alwaysAsap && !dateRanges.isValidDateRange(dateRange))) {
        result.set(servCodeId, {
          servCodeId,
          dateRange,
          projectedEndDate: null,
          deltaDays: null,
          deltaDaysCSP: null,
        });
        continue;
      }

      const openDate = servCode.alwaysAsap
        ? today
        : (perDay.projectionStartDate ?? (today > dateRange.min ? today : dateRange.min));
      const closeDate = servCode.alwaysAsap ? today : dateRange.max;

      const availability = buildDimensionAvailability(servCode, servCodeId, openDate, cascadeMap);
      const pool = perDay.activeAsapCSP;

      const projectedEndCount = computePoolDrainDate(availability.count, pool.count, openDate, closeDate);
      const deltaDaysCSP = computeDeltaDaysCSP(availability, pool, openDate, closeDate);

      const projectedEndDate = projectedEndCount;
      const deltaDays =
        projectedEndDate != null && pool.count > 0
          ? dateRanges.weekdaysBetween(closeDate, projectedEndDate)
          : null;

      result.set(servCodeId, {
        servCodeId,
        dateRange,
        projectedEndDate: projectedEndDate ?? null,
        deltaDays,
        deltaDaysCSP,
      } satisfies ServCodePaceDelta);
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 5b — ProgCode Projected Completion Map
// ---------------------------------------------------------------------------

// Returns the latest projected end date across all servCodes in a progCode.
// Falls back to dateRange.max when a servCode has no team lookback data.
function computeProgCodeProjectedCompletion(
  servCodePaces: { servCode: { servCodeId: string; dateRange: { max: string | null } } }[],
  deltaMap: Map<string, ServCodePaceDelta>,
): ProgCodeProjectedCompletion {
  const dates: string[] = [];
  let anyEstimated = false;

  for (const sp of servCodePaces) {
    const delta = deltaMap.get(sp.servCode.servCodeId);
    if (delta?.projectedEndDate != null) {
      dates.push(delta.projectedEndDate);
    } else if (sp.servCode.dateRange.max) {
      anyEstimated = true;
      dates.push(sp.servCode.dateRange.max);
    }
  }

  return {
    date: dates.length > 0 ? [...dates].sort().at(-1)! : null,
    isEstimated: anyEstimated,
  };
}

const selectProgCodeProjectedCompletionMap = createSelector(
  [servCodePaceSelect.progCodePaces, selectServCodePaceDeltaMap],
  (progCodePaces, deltaMap): Map<string, ProgCodeProjectedCompletion> => {
    const result = new Map<string, ProgCodeProjectedCompletion>();
    for (const progCodePace of progCodePaces) {
      result.set(
        progCodePace.progCode.progCodeId,
        computeProgCodeProjectedCompletion(progCodePace.servCodePaces, deltaMap),
      );
    }
    return result;
  },
);

const selectMatrixDeltaDaysBounds = createSelector(
  [selectServCodePaceDeltaMap],
  (deltaMap): [number, number] => {
    let min = 0;
    let max = 0;
    for (const { deltaDays } of deltaMap.values()) {
      if (deltaDays == null) continue;
      if (deltaDays < min) min = deltaDays;
      if (deltaDays > max) max = deltaDays;
    }
    return [min, max];
  },
);

// ---------------------------------------------------------------------------
// Matrix filter/sort helpers
// ---------------------------------------------------------------------------

// Resolves the CSP to display for a servCode based on the current display mode.
function getServCodeCspForDisplay(
  servCodeId: string,
  cspDisplay: MatrixDisplayConfig["cspDisplay"],
  perDayMap: ReturnType<typeof rawPaceSelect.rawServCodePacesPerDayMap>,
  perDayPerEmployeeMap: ReturnType<typeof rawPaceSelect.rawServCodePacesPerDayPerEmployeeMap>,
): CSP {
  if (cspDisplay === "perDay") {
    return perDayMap.get(servCodeId)?.unfinishedPerDay ?? { ...baseCountSizePrice };
  }
  if (cspDisplay === "perDayPerEmployee") {
    return perDayPerEmployeeMap.get(servCodeId)?.unfinishedPerDayPerEmployee ?? { ...baseCountSizePrice };
  }
  return perDayMap.get(servCodeId)?.activeAsapCSP ?? { ...baseCountSizePrice };
}

// Returns true if the progCode passes the assigned-employee filter.
function passesAssignedFilter(
  progCodePace: ReturnType<typeof servCodePaceSelect.progCodePaces>[number],
  filterAssigned: MatrixDisplayConfig["filterAssigned"],
): boolean {
  if (filterAssigned === "all") return true;
  const totalAssigned = progCodePace.servCodePaces.reduce(
    (sum, sp) => sum + sp.servCode.assignedTo.length,
    0,
  );
  if (filterAssigned === "withAssigned" && totalAssigned === 0) return false;
  if (filterAssigned === "withoutAssigned" && totalAssigned > 0) return false;
  return true;
}

// Returns true if the progCode has at least one servCode matching the category filter.
function passesCategoryFilter(
  progCodePace: ReturnType<typeof servCodePaceSelect.progCodePaces>[number],
  filterCategories: MatrixDisplayConfig["filterCategories"],
): boolean {
  if (filterCategories.length === 0) return true;
  return progCodePace.servCodePaces.some((sp) => filterCategories.includes(sp.category));
}

// Returns true if the progCode has at least one servCode within the delta days range.
function passesDeltaDaysFilter(
  progCodePace: ReturnType<typeof servCodePaceSelect.progCodePaces>[number],
  filterDeltaDays: MatrixDisplayConfig["filterDeltaDays"],
  deltaMap: Map<string, ServCodePaceDelta>,
): boolean {
  if (filterDeltaDays == null) return true;
  const [minDelta, maxDelta] = filterDeltaDays;
  return progCodePace.servCodePaces.some((sp) => {
    const delta = deltaMap.get(sp.servCode.servCodeId)?.deltaDays;
    if (delta == null) return false;
    return delta >= minDelta && delta <= maxDelta;
  });
}

const selectMatrixFilteredSortedProgCodePaces = createSelector(
  [
    servCodePaceSelect.progCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    rawPaceSelect.rawServCodePacesPerDayPerEmployeeMap,
    selectServCodePaceDeltaMap,
    selectMatrixDisplayConfig,
  ],
  (progCodePaces, perDayMap, perDayPerEmployeeMap, deltaMap, config) => {
    const { sortKey, filterAssigned, filterCategories, filterDeltaDays, cspDisplay } = config;

    const filtered = progCodePaces.filter(
      (p) =>
        passesAssignedFilter(p, filterAssigned) &&
        passesCategoryFilter(p, filterCategories) &&
        passesDeltaDaysFilter(p, filterDeltaDays, deltaMap),
    );

    return [...filtered].sort((a, b) => {
      if (sortKey === "dateRange") {
        const minA =
          a.servCodePaces.map((p) => p.servCode.dateRange.min ?? "").filter(Boolean).sort()[0] ?? "";
        const minB =
          b.servCodePaces.map((p) => p.servCode.dateRange.min ?? "").filter(Boolean).sort()[0] ?? "";
        if (minA !== minB) return minA.localeCompare(minB);
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      if (sortKey === "assignedCount") {
        const countA = new Set(
          a.servCodePaces.flatMap((sp) => sp.servCode.assignedTo.map((e) => e.employeeId)),
        ).size;
        const countB = new Set(
          b.servCodePaces.flatMap((sp) => sp.servCode.assignedTo.map((e) => e.employeeId)),
        ).size;
        if (countA !== countB) return countB - countA;
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      const dim = sortKey as "count" | "size" | "price" | "rev";
      const sumA = a.servCodePaces.reduce(
        (s, sp) => s + getServCodeCspForDisplay(sp.servCode.servCodeId, cspDisplay, perDayMap, perDayPerEmployeeMap)[dim],
        0,
      );
      const sumB = b.servCodePaces.reduce(
        (s, sp) => s + getServCodeCspForDisplay(sp.servCode.servCodeId, cspDisplay, perDayMap, perDayPerEmployeeMap)[dim],
        0,
      );
      if (sumA !== sumB) return sumB - sumA;
      return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
    });
  },
);

// ---------------------------------------------------------------------------
// Layer 6 — Season Optimizer
// ---------------------------------------------------------------------------

// Computes the proposed min date for a not-yet-started servCode.
// Uses the earliest cascade availableFrom across assigned employees as a floor, bounded by:
//   1. plannedMin — never propose earlier than the servCode's planned start date
//   2. sequentialCursor — for sequential progCodes, never start before the previous servCode ends
// This applies to ALL not-yet-started servCodes, not just sequential ones, because an employee's
// cascade priority queue may delay their availability even for non-sequential programs.
function computeCascadeAwareProposedMin(
  sp: ReturnType<typeof servCodePaceSelect.progCodePaces>[number]["servCodePaces"][number],
  plannedMin: string,
  sequentialCursor: string | null,
  cascadeMap: ReturnType<typeof cascadeSelect.employeeCascadeMap>,
): string {
  let earliest: string | null = null;
  for (const employee of sp.servCode.assignedTo) {
    const entry = cascadeMap.get(employee.employeeId)?.byServCode.get(sp.servCode.servCodeId);
    if (entry?.availableFrom) {
      if (!earliest || entry.availableFrom < earliest) earliest = entry.availableFrom;
    }
  }
  const cascadeMin = earliest ?? plannedMin;
  // Never propose earlier than the planned start date
  const flooredMin = cascadeMin > plannedMin ? cascadeMin : plannedMin;
  // For sequential programs, also respect the cursor (null for non-sequential, so no effect)
  return sequentialCursor && sequentialCursor > flooredMin ? sequentialCursor : flooredMin;
}

const selectSeasonOptimizerResult = createSelector(
  [
    servCodePaceSelect.progCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    selectServCodePaceDeltaMap,
    cascadeSelect.employeeCascadeMap,
  ],
  (progCodePaces, perDayMap, deltaMap, cascadeMap): SeasonOptimizedRange[] => {
    const today = dateStrings.today();
    const results: SeasonOptimizedRange[] = [];

    for (const progCodePace of progCodePaces) {
      const runsInSequence = progCodePace.progCode.runsInSequence;

      // For sequential progCodes: track the day after each servCode's proposedMax so the
      // next servCode's min is guaranteed to start AFTER the previous one ends.
      let sequentialCursor: string | null = null;

      for (const sp of progCodePace.servCodePaces) {
        const servCodeId = sp.servCode.servCodeId;
        const currentRange = sp.servCode.dateRange;
        const paddingDays = sp.servCode.paddingDays;
        const perDay = perDayMap.get(servCodeId);
        const delta = deltaMap.get(servCodeId);

        const openDate = perDay
          ? (perDay.projectionStartDate ?? (today > currentRange.min ? today : currentRange.min))
          : currentRange.min;

        const isStarted = openDate <= today;
        const projectedEndDate = delta?.projectedEndDate ?? null;
        const hasWork = projectedEndDate !== null && (perDay?.activeAsapCSP.price ?? 0) > 0;

        let proposedMin: string;
        if (isStarted) {
          // Already in progress — keep the planned start date unchanged and reset the cursor.
          proposedMin = currentRange.min;
          sequentialCursor = null;
        } else {
          // Not yet started: use cascade availability as a floor for all programs.
          // For non-sequential programs, sequentialCursor is null so it has no effect.
          proposedMin = computeCascadeAwareProposedMin(sp, currentRange.min, sequentialCursor, cascadeMap);
        }

        const proposedMax = hasWork && projectedEndDate
          ? dateStrings.addWeekdays(projectedEndDate, paddingDays)
          : currentRange.max;

        if (runsInSequence && hasWork) {
          sequentialCursor = dateStrings.addWeekdays(proposedMax, 1);
        }

        results.push({
          servCodeId,
          progCodeId: progCodePace.progCode.progCodeId,
          servCodeName: sp.servCode.longName,
          currentRange,
          proposedMin,
          proposedMax,
          projectedEndDate,
          paddingDays,
          runsInSequence,
          isStarted,
          hasWork,
        });
      }
    }

    return results;
  },
);

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const matrixSelect = {
  // Slice selectors
  matrixDisplayConfig: selectMatrixDisplayConfig,
  seasonOptimizerConfig: selectSeasonOptimizerConfig,
  // Layer 5
  servCodePaceDeltaMap: selectServCodePaceDeltaMap,
  progCodeProjectedCompletionMap: selectProgCodeProjectedCompletionMap,
  matrixDeltaDaysBounds: selectMatrixDeltaDaysBounds,
  matrixFilteredSortedProgCodePaces: selectMatrixFilteredSortedProgCodePaces,
  // Layer 6
  seasonOptimizerResult: selectSeasonOptimizerResult,
};
