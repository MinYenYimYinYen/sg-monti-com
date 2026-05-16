import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { MatrixDisplayConfig } from "@/app/bizPlan/pace/slices/paceSlice";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { rawPaceSelect } from "@/app/bizPlan/pace/selectors/rawPaceSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
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

function computePoolDrainDate(
  employeeAvailability: { availableFrom: string; rate: number }[],
  pool: number,
  projectionStart: string,
  closeDate: string,
): string | null {
  if (pool <= 0) return projectionStart;
  if (employeeAvailability.length === 0) return null;

  const boundarySet = new Set<string>([projectionStart, closeDate]);
  for (const { availableFrom } of employeeAvailability) {
    if (availableFrom >= projectionStart) boundarySet.add(availableFrom);
  }
  const boundaries = [...boundarySet].sort();

  let remaining = pool;

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

  // Pool not exhausted — project beyond deadline
  let finalRate = 0;
  for (const { availableFrom, rate } of employeeAvailability) {
    if (availableFrom <= closeDate) finalRate += rate;
  }
  if (finalRate <= 0) return null;

  const daysNeeded = remaining / finalRate;
  return dateStrings.addWeekdays(closeDate, daysNeeded);
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

      if (
        !perDay ||
        (!servCode.alwaysAsap && !dateRanges.isValidDateRange(dateRange))
      ) {
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
        : (perDay.projectionStartDate ??
          (today > dateRange.min ? today : dateRange.min));
      const closeDate = servCode.alwaysAsap ? today : dateRange.max;

      const availabilityCount: { availableFrom: string; rate: number }[] = [];
      const availabilitySize: { availableFrom: string; rate: number }[] = [];
      const availabilityPrice: { availableFrom: string; rate: number }[] = [];

      for (const employee of servCode.assignedTo) {
        const cascadeResult = cascadeMap.get(employee.employeeId);
        const entry = cascadeResult?.byServCode.get(servCodeId);
        if (!entry) continue;

        const availFrom = entry.availableFrom ?? openDate;

        if (entry.dailyRate.count > 0)
          availabilityCount.push({
            availableFrom: availFrom,
            rate: entry.dailyRate.count,
          });
        if (entry.dailyRate.size > 0)
          availabilitySize.push({
            availableFrom: availFrom,
            rate: entry.dailyRate.size,
          });
        if (entry.dailyRate.price > 0)
          availabilityPrice.push({
            availableFrom: availFrom,
            rate: entry.dailyRate.price,
          });
      }

      const pool = perDay.activeAsapCSP;

      const projectedEndCount = computePoolDrainDate(
        availabilityCount,
        pool.count,
        openDate,
        closeDate,
      );
      const projectedEndSize = computePoolDrainDate(
        availabilitySize,
        pool.size,
        openDate,
        closeDate,
      );
      const projectedEndPrice = computePoolDrainDate(
        availabilityPrice,
        pool.price,
        openDate,
        closeDate,
      );

      const projectedEndDate = projectedEndCount;
      const deltaDays =
        projectedEndDate != null && pool.count > 0
          ? dateRanges.weekdaysBetween(closeDate, projectedEndDate)
          : null;

      const deltaDaysCSP = {
        count:
          projectedEndCount != null && pool.count > 0
            ? dateRanges.weekdaysBetween(closeDate, projectedEndCount)
            : null,
        size:
          projectedEndSize != null && pool.size > 0
            ? dateRanges.weekdaysBetween(closeDate, projectedEndSize)
            : null,
        price:
          projectedEndPrice != null && pool.price > 0
            ? dateRanges.weekdaysBetween(closeDate, projectedEndPrice)
            : null,
      };

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

/**
 * Returns the projected completion date for each ProgCode — the latest projected end date
 * across all its servCodes. When a servCode has no team lookback data, falls back to
 * dateRange.max (assume on-time completion). `isEstimated` is true when any fallback was used.
 */
const selectProgCodeProjectedCompletionMap = createSelector(
  [servCodePaceSelect.progCodePaces, selectServCodePaceDeltaMap],
  (
    progCodePaces,
    deltaMap,
  ): Map<string, ProgCodeProjectedCompletion> => {
    const result = new Map<string, ProgCodeProjectedCompletion>();

    for (const progCodePace of progCodePaces) {
      const dates: string[] = [];
      let anyEstimated = false;

      for (const sp of progCodePace.servCodePaces) {
        const delta = deltaMap.get(sp.servCode.servCodeId);
        if (delta?.projectedEndDate != null) {
          dates.push(delta.projectedEndDate);
        } else if (sp.servCode.dateRange.max) {
          // No team data — fall back to the planned end date (assume on-time)
          anyEstimated = true;
          dates.push(sp.servCode.dateRange.max);
        }
      }

      result.set(progCodePace.progCode.progCodeId, {
        date: dates.length > 0 ? [...dates].sort().at(-1)! : null,
        isEstimated: anyEstimated,
      });
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

const selectMatrixFilteredSortedProgCodePaces = createSelector(
  [
    servCodePaceSelect.progCodePaces,
    rawPaceSelect.rawServCodePacesPerDayMap,
    rawPaceSelect.rawServCodePacesPerDayPerEmployeeMap,
    selectServCodePaceDeltaMap,
    selectMatrixDisplayConfig,
  ],
  (
    progCodePaces,
    perDayMap,
    perDayPerEmployeeMap,
    deltaMap,
    config,
  ) => {
    const {
      sortKey,
      filterAssigned,
      filterCategories,
      filterDeltaDays,
      cspDisplay,
    } = config;

    function getServCodeCsp(servCodeId: string): CountSizePrice {
      if (cspDisplay === "perDay") {
        return (
          perDayMap.get(servCodeId)?.unfinishedPerDay ?? {
            ...baseCountSizePrice,
          }
        );
      }
      if (cspDisplay === "perDayPerEmployee") {
        return (
          perDayPerEmployeeMap.get(servCodeId)?.unfinishedPerDayPerEmployee ?? {
            ...baseCountSizePrice,
          }
        );
      }
      return (
        perDayMap.get(servCodeId)?.activeAsapCSP ?? { ...baseCountSizePrice }
      );
    }

    const filtered = progCodePaces.filter((p) => {
      if (filterAssigned !== "all") {
        const totalAssigned = p.servCodePaces.reduce(
          (sum, sp) => sum + sp.servCode.assignedTo.length,
          0,
        );
        if (filterAssigned === "withAssigned" && totalAssigned === 0)
          return false;
        if (filterAssigned === "withoutAssigned" && totalAssigned > 0)
          return false;
      }

      if (filterCategories.length > 0) {
        const hasMatchingCategory = p.servCodePaces.some((sp) =>
          filterCategories.includes(sp.category),
        );
        if (!hasMatchingCategory) return false;
      }

      if (filterDeltaDays != null) {
        const [minDelta, maxDelta] = filterDeltaDays;
        const anyInRange = p.servCodePaces.some((sp) => {
          const delta = deltaMap.get(sp.servCode.servCodeId)?.deltaDays;
          if (delta == null) return false;
          return delta >= minDelta && delta <= maxDelta;
        });
        if (!anyInRange) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "dateRange") {
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
      }

      if (sortKey === "assignedCount") {
        const countA = new Set(
          a.servCodePaces.flatMap((sp) =>
            sp.servCode.assignedTo.map((e) => e.employeeId),
          ),
        ).size;
        const countB = new Set(
          b.servCodePaces.flatMap((sp) =>
            sp.servCode.assignedTo.map((e) => e.employeeId),
          ),
        ).size;
        if (countA !== countB) return countB - countA;
        return a.progCode.progCodeId.localeCompare(b.progCode.progCodeId);
      }

      const dim = sortKey as "count" | "size" | "price" | "rev";
      const sumA = a.servCodePaces.reduce(
        (s, sp) => s + getServCodeCsp(sp.servCode.servCodeId)[dim],
        0,
      );
      const sumB = b.servCodePaces.reduce(
        (s, sp) => s + getServCodeCsp(sp.servCode.servCodeId)[dim],
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
        if (isStarted || !runsInSequence) {
          proposedMin = currentRange.min;
          // Reset cursor when a started/independent servCode is encountered
          if (isStarted) sequentialCursor = null;
        } else {
          // Use cascade's first-worked date: the earliest availableFrom across assigned employees
          let earliest: string | null = null;
          for (const employee of sp.servCode.assignedTo) {
            const entry = cascadeMap.get(employee.employeeId)?.byServCode.get(servCodeId);
            if (entry?.availableFrom) {
              if (!earliest || entry.availableFrom < earliest) {
                earliest = entry.availableFrom;
              }
            }
          }
          const cascadeMin = earliest ?? openDate;
          // Ensure this servCode doesn't start before the previous sequential one ends
          proposedMin = sequentialCursor && sequentialCursor > cascadeMin
            ? sequentialCursor
            : cascadeMin;
        }

        const proposedMax = hasWork && projectedEndDate
          ? dateStrings.addWeekdays(projectedEndDate, paddingDays)
          : currentRange.max;

        // Advance sequential cursor past this servCode's proposed end
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
