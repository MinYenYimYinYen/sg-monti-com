import { createSelector } from "@reduxjs/toolkit";
import { cascadeSelect } from "@/app/bizPlan/pace/selectors/cascadeSelect";
import { servCodePaceSelect } from "@/app/bizPlan/pace/selectors/servCodePaceSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  EmployeeAllocation,
  EmployeeCardData,
  ServCodePace,
} from "@/app/bizPlan/pace/PaceTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nearestWeekday(date: string): string {
  let d = date;
  while (!dateStrings.isWeekDay(d)) d = dateStrings.addDays(d, 1);
  return d;
}

export const PX_PER_DAY = 16;

type WeekdayBounds = {
  min: string;
  max: string;
  weekdayCount: number;
  trackHeightPx: number;
};

type DateTick = {
  date: string;
  labels: string[];
  weekdayIndex: number;
};

type SegmentColor = "primary" | "accent" | "destructive";

type TimelineSegment = {
  from: string;
  to: string;
  color: SegmentColor;
};

function weekdaysRemainingLocal(from: string, to: string): number {
  if (to < from) return 1;
  return Math.max(1, dateRanges.countWeekdays({ min: from, max: to }));
}

function isServCodeActiveOn(servCode: ServCodeDeep, date: string): boolean {
  if (servCode.alwaysAsap) return true;
  const { min, max } = servCode.dateRange;
  if (!min || !max) return false;
  return date >= min && date <= max;
}

function weekdaysAheadOf(date: string): number {
  const today = dateStrings.today();
  if (date <= today) return 0;
  return Math.max(0, dateRanges.countWeekdays({ min: today, max: date }) - 1);
}

function projectUnfinishedCSP(
  pace: ServCodePace,
  daysAhead: number,
): CountSizePrice {
  if (daysAhead <= 0) return pace.unfinishedCSP;
  const projected = CountSizePriceOps.subtract(
    pace.unfinishedCSP,
    CountSizePriceOps.multiply(pace.teamExpectedCSP, daysAhead),
  );
  return {
    count: Math.max(0, projected.count),
    size: Math.max(0, projected.size),
    price: Math.max(0, projected.price),
    rev: Math.max(0, projected.rev),
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

// ---------------------------------------------------------------------------
// Employee Card Data
// ---------------------------------------------------------------------------

const selectEmployeeCardDataFull = createSelector(
  [
    cascadeSelect.employeeCascadeResults,
    servCodePaceSelect.servCodePaceMap,
    assignmentPlanSelect.assignmentsByEmployeeId,
  ],
  (
    cascadeResults,
    servCodePaceMap,
    assignmentsByEmployeeId,
  ): EmployeeCardData[] => {
    const result: EmployeeCardData[] = [];

    for (const cascadeResult of cascadeResults) {
      const { employee, totalAvgDailyCSP, byServCode } = cascadeResult;
      const priorityOrder =
        assignmentsByEmployeeId.get(employee.employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      const allocations: EmployeeAllocation[] = [];

      for (const [servCodeId, entry] of byServCode) {
        const pace = servCodePaceMap.get(servCodeId);
        if (!pace) continue;

        allocations.push({
          servCode: pace.servCode,
          fractionConsumed: entry.fractionConsumed,
          expectedCSP: entry.contributedCSP,
          avgDailyCSP: entry.isEstimated ? null : entry.dailyRate,
          maxDailyCSP: entry.isEstimated ? null : entry.maxDailyRate,
        });
      }

      if (allocations.length === 0) continue;

      // Sort by priority order
      allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });

      const fractionValues = allocations
        .map((a) => a.fractionConsumed)
        .filter((f): f is CountSizePrice => f !== null);

      const totalFractionConsumed =
        fractionValues.length > 0
          ? CountSizePriceOps.sumAll(fractionValues)
          : null;

      const freeCapacityFraction = totalFractionConsumed
        ? {
            count: Math.max(0, 1 - totalFractionConsumed.count),
            size: Math.max(0, 1 - totalFractionConsumed.size),
            price: Math.max(0, 1 - totalFractionConsumed.price),
            rev: Math.max(0, 1 - totalFractionConsumed.rev),
          }
        : null;

      result.push({
        employee,
        totalAvgDailyCSP,
        allocations,
        totalFractionConsumed,
        freeCapacityFraction,
      });
    }

    return result.sort((a, b) =>
      a.employee.name.localeCompare(b.employee.name),
    );
  },
);

// ---------------------------------------------------------------------------
// Date Bounds & Ticks
// ---------------------------------------------------------------------------

const selectDateBounds = createSelector(
  [servCodePaceSelect.servCodePaces],
  (paces) => {
    const dates: string[] = [];
    for (const pace of paces) {
      const { dateRange } = pace.servCode;
      if (dateRange.min) dates.push(dateRange.min);
      if (dateRange.max) dates.push(dateRange.max);
    }
    if (dates.length === 0) return null;
    const sorted = [...dates].sort();
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  },
);

const selectWeekdayBounds = createSelector(
  [selectDateBounds],
  (bounds): WeekdayBounds | null => {
    if (!bounds) return null;
    const weekdayCount = dateRanges.countWeekdays({
      min: bounds.min,
      max: bounds.max,
    });
    return {
      min: bounds.min,
      max: bounds.max,
      weekdayCount,
      trackHeightPx: Math.max(weekdayCount * PX_PER_DAY, PX_PER_DAY),
    };
  },
);

const selectDateTicks = createSelector(
  [servCodePaceSelect.servCodePaces, selectWeekdayBounds],
  (paces, weekdayBounds): DateTick[] => {
    if (!weekdayBounds) return [];

    const startsByDate = new Map<string, string[]>();
    const finishesByDate = new Map<string, string[]>();

    function addTo(
      map: Map<string, string[]>,
      date: string | null | undefined,
      id: string,
    ) {
      if (!date) return;
      const effectiveDate = nearestWeekday(date);
      const existing = map.get(effectiveDate) ?? [];
      existing.push(id);
      map.set(effectiveDate, existing);
    }

    for (const pace of paces) {
      const id = pace.servCode.servCodeId;
      const { dateRange } = pace.servCode;
      addTo(startsByDate, dateRange.min, id);
      addTo(finishesByDate, dateRange.max, id);
    }

    const allDates = new Set([
      ...startsByDate.keys(),
      ...finishesByDate.keys(),
    ]);

    return [...allDates]
      .sort()
      .map((date) => {
        const starts = startsByDate.get(date) ?? [];
        const finishes = finishesByDate.get(date) ?? [];
        const labels: string[] = [];
        if (starts.length > 0) labels.push(`Start ${starts.join(", ")}`);
        if (finishes.length > 0) labels.push(`Finish ${finishes.join(", ")}`);
        return {
          date,
          labels,
          weekdayIndex: !dateStrings.isWeekDay(date)
            ? -1
            : dateRanges.countWeekdays({ min: weekdayBounds.min, max: date }) -
              1,
        };
      })
      .filter((t) => t.weekdayIndex >= 0);
  },
);

// ---------------------------------------------------------------------------
// Effective Date (per-employee override)
// ---------------------------------------------------------------------------

function makeSelectEffectiveDate(employeeId: string) {
  return createSelector(
    [cascadeSelect.mainDate, cascadeSelect.employeeDates],
    (mainDate, employeeDates) => employeeDates[employeeId] ?? mainDate,
  );
}

// ---------------------------------------------------------------------------
// Projected Allocations (for a specific employee on a specific date)
// ---------------------------------------------------------------------------

type EmployeeAllocationsInput = {
  employeeId: string;
  date: string;
};

function makeSelectProjectedAllocations({
  employeeId,
  date,
}: EmployeeAllocationsInput) {
  return createSelector(
    [
      servCodePaceSelect.servCodePaces,
      cascadeSelect.employeeCascadeMap,
      assignmentPlanSelect.assignmentsByEmployeeId,
      cascadeSelect.rateMode,
    ],
    (
      servCodePaces,
      cascadeMap,
      assignmentsByEmployeeId,
      rateMode,
    ): EmployeeAllocation[] => {
      const priorityOrder =
        assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      const cascadeResult = cascadeMap.get(employeeId);
      const totalAvgDailyCSP = cascadeResult?.totalAvgDailyCSP ?? null;

      const allocations: EmployeeAllocation[] = [];

      for (const pace of servCodePaces) {
        // Pass overdue servCodes with remaining work even when date > dateRange.max —
        // the cascade's effective close date extends them, so they should still display.
        const isActive = isServCodeActiveOn(pace.servCode, date);
        const isOverdueWithWork =
          !isActive &&
          pace.servCode.dateRange.max != null &&
          date > pace.servCode.dateRange.max &&
          pace.unfinishedCSP.count > 0;
        if (!isActive && !isOverdueWithWork) continue;

        const share = pace.employeeShares.find(
          (s) => s.employee.employeeId === employeeId,
        );
        if (!share) continue;

        const entry = cascadeResult?.byServCode.get(pace.servCode.servCodeId);

        // Cascade gate: never available or not yet available
        const availableFrom = entry?.availableFrom;
        const isInPriorityList = priorityOrder.includes(
          pace.servCode.servCodeId,
        );
        const neverAvailable = isInPriorityList && availableFrom === undefined;
        const notYetAvailable =
          availableFrom !== undefined && date < availableFrom;

        if (neverAvailable || notYetAvailable) {
          allocations.push({
            servCode: pace.servCode,
            expectedCSP: { ...baseCountSizePrice },
            avgDailyCSP: share.isEstimated ? null : share.dailyRate,
            maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
            fractionConsumed: null,
          });
          continue;
        }

        // Target CSP = min(employee's daily rate, their proportional share of the demand rate).
        // This answers "what should this employee route today?" rather than "how much of the
        // pool did the cascade assign them?" The cascade's availableFrom gate (above) still
        // enforces the waterfall — LR2 only gets a target once LR1 is exhausted.
        const effectiveMax = isOverdueWithWork
          ? date
          : pace.servCode.dateRange.max ?? date;
        const daysLeft = Math.max(
          1,
          dateRanges.countWeekdays({ min: date, max: effectiveMax }),
        );
        const demandRate = CountSizePriceOps.divideBy(
          pace.unfinishedCSP,
          daysLeft,
        );

        let expectedCSP: CountSizePrice;
        if (entry && !entry.isEstimated) {
          // Employee's proportional share of the demand rate, weighted by their daily rate
          const teamAvgCSP = CountSizePriceOps.sumAll(
            pace.employeeShares
              .filter((s) => !s.isEstimated)
              .map((s) => s.dailyRate),
          );
          const employeeDemandShare: CountSizePrice = {
            count:
              teamAvgCSP.count > 0
                ? demandRate.count * (entry.dailyRate.count / teamAvgCSP.count)
                : 0,
            size:
              teamAvgCSP.size > 0
                ? demandRate.size * (entry.dailyRate.size / teamAvgCSP.size)
                : 0,
            price:
              teamAvgCSP.price > 0
                ? demandRate.price * (entry.dailyRate.price / teamAvgCSP.price)
                : 0,
            rev:
              teamAvgCSP.rev > 0
                ? demandRate.rev * (entry.dailyRate.rev / teamAvgCSP.rev)
                : 0,
          };

          // Use avg or max rate depending on rateMode toggle
          const capacityRate =
            rateMode === "max" ? entry.maxDailyRate : entry.dailyRate;

          // Target is the lesser of capacity and demand — don't suggest more than needed
          expectedCSP = minCSP(capacityRate, employeeDemandShare);
        } else {
          // Fallback for estimated employees: even split of demand rate
          const assignedCount = pace.employeeShares.length || 1;
          expectedCSP = CountSizePriceOps.divideBy(demandRate, assignedCount);
        }

        const fractionConsumed =
          totalAvgDailyCSP &&
          (totalAvgDailyCSP.count > 0 || totalAvgDailyCSP.size > 0)
            ? {
                count:
                  totalAvgDailyCSP.count > 0
                    ? expectedCSP.count / totalAvgDailyCSP.count
                    : 0,
                size:
                  totalAvgDailyCSP.size > 0
                    ? expectedCSP.size / totalAvgDailyCSP.size
                    : 0,
                price:
                  totalAvgDailyCSP.price > 0
                    ? expectedCSP.price / totalAvgDailyCSP.price
                    : 0,
                rev:
                  totalAvgDailyCSP.rev > 0
                    ? expectedCSP.rev / totalAvgDailyCSP.rev
                    : 0,
              }
            : null;

        allocations.push({
          servCode: pace.servCode,
          expectedCSP,
          avgDailyCSP: share.isEstimated ? null : share.dailyRate,
          maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
          fractionConsumed,
        });
      }

      return allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Not Started Allocations (for a specific employee)
// ---------------------------------------------------------------------------

function makeSelectNotStartedAllocations({
  employeeId,
}: {
  employeeId: string;
}) {
  return createSelector(
    [
      servCodePaceSelect.servCodePaces,
      cascadeSelect.employeeCascadeMap,
      assignmentPlanSelect.assignmentsByEmployeeId,
    ],
    (
      servCodePaces,
      cascadeMap,
      assignmentsByEmployeeId,
    ): EmployeeAllocation[] => {
      const priorityOrder =
        assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      const cascadeResult = cascadeMap.get(employeeId);
      const totalAvgDailyCSP = cascadeResult?.totalAvgDailyCSP ?? null;
      const today = dateStrings.today();

      const allocations: EmployeeAllocation[] = [];

      for (const pace of servCodePaces) {
        if (pace.category !== "notStarted") continue;

        const share = pace.employeeShares.find(
          (s) => s.employee.employeeId === employeeId,
        );
        if (!share) continue;

        const entry = cascadeResult?.byServCode.get(pace.servCode.servCodeId);
        const availableFrom = entry?.availableFrom;

        if (availableFrom && today < availableFrom) {
          allocations.push({
            servCode: pace.servCode,
            expectedCSP: { ...baseCountSizePrice },
            avgDailyCSP: share.isEstimated ? null : share.dailyRate,
            maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
            fractionConsumed: null,
          });
          continue;
        }

        const daysLeft = weekdaysRemainingLocal(
          today,
          pace.servCode.dateRange.max ?? today,
        );
        const rateAsOfToday = CountSizePriceOps.divideBy(
          pace.unfinishedCSP,
          daysLeft || 1,
        );

        let expectedCSP = { ...baseCountSizePrice };
        if (!share.isEstimated && share.dailyRate) {
          const teamAvg = CountSizePriceOps.sumAll(
            pace.employeeShares
              .filter((s) => !s.isEstimated)
              .map((s) => s.dailyRate),
          );
          expectedCSP = {
            count:
              teamAvg.count > 0
                ? rateAsOfToday.count * (share.dailyRate.count / teamAvg.count)
                : 0,
            size:
              teamAvg.size > 0
                ? rateAsOfToday.size * (share.dailyRate.size / teamAvg.size)
                : 0,
            price:
              teamAvg.price > 0
                ? rateAsOfToday.price * (share.dailyRate.price / teamAvg.price)
                : 0,
            rev:
              teamAvg.rev > 0
                ? rateAsOfToday.rev * (share.dailyRate.rev / teamAvg.rev)
                : 0,
          };
        } else {
          const assignedCount = pace.employeeShares.length || 1;
          expectedCSP = CountSizePriceOps.divideBy(
            rateAsOfToday,
            assignedCount,
          );
        }

        const fractionConsumed =
          totalAvgDailyCSP &&
          (totalAvgDailyCSP.count > 0 || totalAvgDailyCSP.size > 0)
            ? {
                count:
                  totalAvgDailyCSP.count > 0
                    ? expectedCSP.count / totalAvgDailyCSP.count
                    : 0,
                size:
                  totalAvgDailyCSP.size > 0
                    ? expectedCSP.size / totalAvgDailyCSP.size
                    : 0,
                price:
                  totalAvgDailyCSP.price > 0
                    ? expectedCSP.price / totalAvgDailyCSP.price
                    : 0,
                rev:
                  totalAvgDailyCSP.rev > 0
                    ? expectedCSP.rev / totalAvgDailyCSP.rev
                    : 0,
              }
            : null;

        allocations.push({
          servCode: pace.servCode,
          expectedCSP,
          avgDailyCSP: share.isEstimated ? null : share.dailyRate,
          maxDailyCSP: share.isEstimated ? null : share.maxDailyRate,
          fractionConsumed,
        });
      }

      return allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Unfinished Share Map
// ---------------------------------------------------------------------------

const selectEmployeeUnfinishedShareMap = createSelector(
  [servCodePaceSelect.servCodePaces],
  (paces): Map<string, Map<string, CountSizePrice>> => {
    const result = new Map<string, Map<string, CountSizePrice>>();

    for (const pace of paces) {
      const teamAvg = pace.teamAvgCapacity;
      const assignedCount = pace.employeeShares.length || 1;

      for (const share of pace.employeeShares) {
        const employeeId = share.employee.employeeId;
        if (!result.has(employeeId)) result.set(employeeId, new Map());
        const byServCode = result.get(employeeId)!;

        let shareRemaining: CountSizePrice;
        if (!share.isEstimated && share.dailyRate) {
          shareRemaining = {
            count:
              teamAvg.count > 0
                ? pace.unfinishedCSP.count *
                  (share.dailyRate.count / teamAvg.count)
                : 0,
            size:
              teamAvg.size > 0
                ? pace.unfinishedCSP.size *
                  (share.dailyRate.size / teamAvg.size)
                : 0,
            price:
              teamAvg.price > 0
                ? pace.unfinishedCSP.price *
                  (share.dailyRate.price / teamAvg.price)
                : 0,
            rev:
              teamAvg.rev > 0
                ? pace.unfinishedCSP.rev * (share.dailyRate.rev / teamAvg.rev)
                : 0,
          };
        } else {
          shareRemaining = CountSizePriceOps.divideBy(
            pace.unfinishedCSP,
            assignedCount,
          );
        }

        byServCode.set(pace.servCode.servCodeId, shareRemaining);
      }
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Timeline Segments
// ---------------------------------------------------------------------------

function makeSelectEmployeeTimelineSegments(employeeId: string) {
  return createSelector(
    [
      servCodePaceSelect.servCodePaces,
      cascadeSelect.employeeCascadeMap,
      selectDateBounds,
      cascadeSelect.paceTolerance,
    ],
    (
      servCodePaces,
      cascadeMap,
      dateBounds,
      paceTolerance,
    ): TimelineSegment[] => {
      if (!dateBounds) return [];

      const boundarySet = new Set<string>([dateBounds.min, dateBounds.max]);
      for (const pace of servCodePaces) {
        if (pace.servCode.dateRange.min)
          boundarySet.add(pace.servCode.dateRange.min);
        if (pace.servCode.dateRange.max)
          boundarySet.add(pace.servCode.dateRange.max);
      }
      const boundaries = [...boundarySet].sort();
      if (boundaries.length < 2) return [];

      const cascadeResult = cascadeMap.get(employeeId);
      const totalAvgDailyCSP = cascadeResult?.totalAvgDailyCSP ?? {
        ...baseCountSizePrice,
      };

      const segments: TimelineSegment[] = [];

      for (let i = 0; i < boundaries.length - 1; i++) {
        const from = boundaries[i];
        const to = boundaries[i + 1];

        const fromMs = new Date(from).getTime();
        const toMs = new Date(to).getTime();
        const midMs = (fromMs + toMs) / 2;
        const midDate = new Date(midMs).toISOString().slice(0, 10);

        const midDaysAhead = weekdaysAheadOf(midDate);
        let totalFraction = 0;

        for (const pace of servCodePaces) {
          if (!isServCodeActiveOn(pace.servCode, midDate)) continue;
          const share = pace.employeeShares.find(
            (s) => s.employee.employeeId === employeeId,
          );
          if (!share) continue;

          const daysLeft = pace.servCode.alwaysAsap
            ? 1
            : weekdaysRemainingLocal(
                midDate,
                pace.servCode.dateRange.max ?? midDate,
              );

          const projectedUnfinished = projectUnfinishedCSP(pace, midDaysAhead);
          const rateAsOfDate = CountSizePriceOps.divideBy(
            projectedUnfinished,
            daysLeft || 1,
          );

          let employeeRate = 0;
          if (
            !share.isEstimated &&
            share.dailyRate &&
            totalAvgDailyCSP.count > 0
          ) {
            const teamAvg = CountSizePriceOps.sumAll(
              pace.employeeShares
                .filter((s) => !s.isEstimated)
                .map((s) => s.dailyRate),
            );
            const employeeShare =
              teamAvg.count > 0
                ? rateAsOfDate.count * (share.dailyRate.count / teamAvg.count)
                : 0;
            employeeRate =
              totalAvgDailyCSP.count > 0
                ? employeeShare / totalAvgDailyCSP.count
                : 0;
          } else if (totalAvgDailyCSP.count > 0) {
            const assignedCount = pace.employeeShares.length || 1;
            employeeRate =
              rateAsOfDate.count / assignedCount / totalAvgDailyCSP.count;
          }

          totalFraction += employeeRate;
        }

        let color: SegmentColor;
        if (totalFraction > 1 + paceTolerance) {
          color = "destructive";
        } else if (totalFraction < 1 - paceTolerance) {
          color = "primary";
        } else {
          color = "accent";
        }

        segments.push({ from, to, color });
      }

      return segments;
    },
  );
}

// ---------------------------------------------------------------------------
// Single export
// ---------------------------------------------------------------------------

export const employeeCardSelect = {
  // Employee card data
  employeeCardData: selectEmployeeCardDataFull,
  // Date bounds & ticks
  dateBounds: selectDateBounds,
  weekdayBounds: selectWeekdayBounds,
  dateTicks: selectDateTicks,
  // Effective date
  makeEffectiveDate: makeSelectEffectiveDate,
  // Allocations
  makeProjectedAllocations: makeSelectProjectedAllocations,
  makeNotStartedAllocations: makeSelectNotStartedAllocations,
  // Unfinished share
  employeeUnfinishedShareMap: selectEmployeeUnfinishedShareMap,
  // Timeline
  makeTimelineSegments: makeSelectEmployeeTimelineSegments,
};

// Re-export types consumed by components
export type { WeekdayBounds, DateTick, TimelineSegment, SegmentColor };
