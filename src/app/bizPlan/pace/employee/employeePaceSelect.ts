import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { EmployeeAllocation, ServCodePace } from "@/app/bizPlan/pace/PaceType";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";

// ---------------------------------------------------------------------------
// Slice selectors
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState) => state.employeePace.mainDate;
const selectEmployeeDates = (state: AppState) => state.employeePace.employeeDates;
const selectPaceTolerance = (state: AppState) => state.employeePace.paceTolerance;
const selectShowUpcoming = (state: AppState) => state.employeePace.showUpcoming;

/** Returns the effective view date for a given employee (override or global) */
function makeSelectEffectiveDate(employeeId: string) {
  return createSelector(
    [selectMainDate, selectEmployeeDates],
    (mainDate, employeeDates) => employeeDates[employeeId] ?? mainDate,
  );
}

// ---------------------------------------------------------------------------
// Weekday helpers — Mon–Fri only, weekends skipped
// ---------------------------------------------------------------------------

/** Returns true if the date string falls on a Saturday or Sunday */
function isWeekend(date: string): boolean {
  const day = new Date(date).getUTCDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

/**
 * Counts weekdays (Mon–Fri) from `from` to `to` inclusive.
 * Both dates must be weekdays.
 */
function countWeekdays(from: string, to: string): number {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (toMs < fromMs) return 0;
  let count = 0;
  let cur = fromMs;
  while (cur <= toMs) {
    const day = new Date(cur).getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cur += 24 * 60 * 60 * 1000;
  }
  return count;
}

/**
 * Returns the 0-based weekday index of `date` within the range starting at `rangeStart`.
 * Weekends are skipped — a Monday after a Friday gets index fridayIndex + 1.
 * Returns -1 if `date` is a weekend.
 */
function weekdayIndexOf(date: string, rangeStart: string): number {
  if (isWeekend(date)) return -1;
  return countWeekdays(rangeStart, date) - 1;
}

/** Advance a date string by one calendar day */
function nextDay(date: string): string {
  const ms = new Date(date).getTime() + 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Return the nearest weekday on or after `date` */
function nearestWeekday(date: string): string {
  let d = date;
  while (isWeekend(d)) d = nextDay(d);
  return d;
}

// ---------------------------------------------------------------------------
// Date bounds — min/max across all servCode dateRanges (excludes alwaysAsap)
// ---------------------------------------------------------------------------

const selectDateBounds = createSelector(
  [paceSelect.servCodePaces],
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

// ---------------------------------------------------------------------------
// Weekday bounds — track height in px based on weekday count
// ---------------------------------------------------------------------------

/** px per weekday slot — sized so one line of text-[10px] (12px) fits with 4px gap */
export const PX_PER_DAY = 16;

type WeekdayBounds = {
  min: string;
  max: string;
  weekdayCount: number;
  trackHeightPx: number;
};

const selectWeekdayBounds = createSelector(
  [selectDateBounds],
  (bounds): WeekdayBounds | null => {
    if (!bounds) return null;
    const weekdayCount = countWeekdays(bounds.min, bounds.max);
    return {
      min: bounds.min,
      max: bounds.max,
      weekdayCount,
      trackHeightPx: Math.max(weekdayCount * PX_PER_DAY, PX_PER_DAY),
    };
  },
);

// ---------------------------------------------------------------------------
// Date ticks — one entry per unique date, with all "Start X" / "Finish X" labels
// ---------------------------------------------------------------------------

type DateTick = {
  date: string;
  labels: string[];
  weekdayIndex: number; // 0-based position in the weekday-only track
};

const selectDateTicks = createSelector(
  [paceSelect.servCodePaces, selectWeekdayBounds],
  (paces, weekdayBounds): DateTick[] => {
    if (!weekdayBounds) return [];

    // Collect starts and finishes separately per date so we can group them
    const startsByDate = new Map<string, string[]>();
    const finishesByDate = new Map<string, string[]>();

    function addTo(map: Map<string, string[]>, date: string | null | undefined, id: string) {
      if (!date) return;
      // Snap weekend dates to the nearest following weekday for display
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

    // Merge all unique dates
    const allDates = new Set([...startsByDate.keys(), ...finishesByDate.keys()]);

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
          weekdayIndex: weekdayIndexOf(date, weekdayBounds.min),
        };
      })
      .filter((t) => t.weekdayIndex >= 0);
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Weekdays from `from` to `to` (inclusive of both endpoints). Min 1 to avoid divide-by-zero. */
function weekdaysRemaining(from: string, to: string): number {
  if (to < from) return 1;
  return Math.max(1, dateRanges.countWeekdays({ min: from, max: to }));
}

/** Returns true if a servCode is active on the given date */
function isServCodeActiveOn(servCode: ServCodeDeep, date: string): boolean {
  if (servCode.alwaysAsap) return true;
  const { min, max } = servCode.dateRange;
  if (!min || !max) return false;
  return date >= min && date <= max;
}

/**
 * Computes the number of weekdays from today to `date` (exclusive of today, inclusive of date).
 * Returns 0 if `date` ≤ today (no projection needed for past/present).
 */
function weekdaysAheadOf(date: string): number {
  const today = dateStrings.today();
  if (date <= today) return 0;
  // countWeekdays is inclusive of both endpoints; subtract 1 to exclude today itself
  return Math.max(0, dateRanges.countWeekdays({ min: today, max: date }) - 1);
}

/**
 * Projects the unfinished CSP for a servCode `daysAhead` weekdays into the future.
 * Assumes the team produces at their current `teamExpectedCSP` rate each day.
 * Clamps each dimension to 0 — can't have negative remaining work.
 */
function projectUnfinishedCSP(pace: ServCodePace, daysAhead: number): CountSizePrice {
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

// ---------------------------------------------------------------------------
// Per-employee allocations at a given date
// Recomputes expectedCSP based on unfinishedCSP / daysRemainingAsOf(date)
// and the employee's weighted share (proportional to avgDailyCSP).
// ---------------------------------------------------------------------------

type EmployeeAllocationsAtDateInput = {
  employeeId: string;
  date: string;
};

function makeSelectEmployeeAllocationsAtDate({ employeeId, date }: EmployeeAllocationsAtDateInput) {
  return createSelector(
    [
      paceSelect.servCodePaces,
      paceSelect.employeeLookbackMap,
      assignmentPlanSelect.assignmentsByEmployeeId,
    ],
    (servCodePaces, lookbackMap, assignmentsByEmployeeId): EmployeeAllocation[] => {
      const priorityOrder = assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      // Get the employee's totalAvgDailyCSP (capacity ceiling) from any programType stats
      // We use the first available stats entry since totalAvgDailyCSP is cross-programType
      const employeeLookback = lookbackMap.get(employeeId);
      let totalAvgDailyCSP = { ...baseCountSizePrice };
      if (employeeLookback) {
        for (const stats of employeeLookback.values()) {
          if (stats?.totalAvgDailyCSP) {
            totalAvgDailyCSP = stats.totalAvgDailyCSP;
            break;
          }
        }
      }

      const daysAhead = weekdaysAheadOf(date);
      const allocations: EmployeeAllocation[] = [];

      for (const pace of servCodePaces) {
        if (!isServCodeActiveOn(pace.servCode, date)) continue;

        // Check if this employee is assigned to this servCode
        const share = pace.employeeShares.find(
          (s) => s.employee.employeeId === employeeId,
        );
        if (!share) continue;

        // Recompute required daily rate as of the given date.
        // When projecting forward, reduce unfinishedCSP by the assumed production
        // that has already occurred between today and the selected date.
        const daysLeft = pace.servCode.alwaysAsap
          ? 1 // asap: treat as 1 day remaining so rate = full unfinishedCSP
          : weekdaysRemaining(date, pace.servCode.dateRange.max ?? date);

        const unfinishedCSP = projectUnfinishedCSP(pace, daysAhead);
        const rateAsOfDate = CountSizePriceOps.divideBy(unfinishedCSP, daysLeft || 1);

        // Employee's weighted share of the rate (use same avgDailyCSP weight as cascade)
        // If no lookback data, fall back to even split
        let expectedCSP = { ...baseCountSizePrice };
        if (share.avgDailyCSP) {
          // Recompute team avg for this servCode at this date
          const teamAvg = CountSizePriceOps.sumAll(
            pace.employeeShares.map((s) => s.avgDailyCSP ?? { ...baseCountSizePrice }),
          );
          expectedCSP = {
            count: teamAvg.count > 0 ? rateAsOfDate.count * (share.avgDailyCSP.count / teamAvg.count) : 0,
            size: teamAvg.size > 0 ? rateAsOfDate.size * (share.avgDailyCSP.size / teamAvg.size) : 0,
            price: teamAvg.price > 0 ? rateAsOfDate.price * (share.avgDailyCSP.price / teamAvg.price) : 0,
            rev: teamAvg.rev > 0 ? rateAsOfDate.rev * (share.avgDailyCSP.rev / teamAvg.rev) : 0,
          };
        } else {
          // Even split fallback
          const assignedCount = pace.employeeShares.length || 1;
          expectedCSP = CountSizePriceOps.divideBy(rateAsOfDate, assignedCount);
        }

        // fractionConsumed = expectedCSP / totalAvgDailyCSP
        const fractionConsumed =
          totalAvgDailyCSP.count > 0 || totalAvgDailyCSP.size > 0
            ? {
                count: totalAvgDailyCSP.count > 0 ? expectedCSP.count / totalAvgDailyCSP.count : 0,
                size: totalAvgDailyCSP.size > 0 ? expectedCSP.size / totalAvgDailyCSP.size : 0,
                price: totalAvgDailyCSP.price > 0 ? expectedCSP.price / totalAvgDailyCSP.price : 0,
                rev: totalAvgDailyCSP.rev > 0 ? expectedCSP.rev / totalAvgDailyCSP.rev : 0,
              }
            : null;

        allocations.push({
          servCode: pace.servCode,
          expectedCSP,
          avgDailyCSP: share.avgDailyCSP,
          fractionConsumed,
        });
      }

      // Sort by priority order
      return allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Per-employee timeline segments for the colored slider track
// One segment per adjacent pair of date boundaries; color based on load level
// ---------------------------------------------------------------------------

type SegmentColor = "primary" | "accent" | "destructive";

type TimelineSegment = {
  from: string;
  to: string;
  color: SegmentColor;
};

/**
 * Pre-computes every employee's proportional share of remaining work for every servCode
 * in a single pass. Keyed as Map<employeeId, Map<servCodeId, CountSizePrice>>.
 *
 * Share is weighted by the employee's avgDailyCSP relative to pace.teamAvgCapacity.
 * Falls back to an even split when no lookback data is available.
 *
 * Components do a simple map lookup — no per-render selector creation needed.
 */
const selectEmployeeShareRemainingMap = createSelector(
  [paceSelect.servCodePaces],
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
        if (share.avgDailyCSP) {
          shareRemaining = {
            count: teamAvg.count > 0 ? pace.unfinishedCSP.count * (share.avgDailyCSP.count / teamAvg.count) : 0,
            size: teamAvg.size > 0 ? pace.unfinishedCSP.size * (share.avgDailyCSP.size / teamAvg.size) : 0,
            price: teamAvg.price > 0 ? pace.unfinishedCSP.price * (share.avgDailyCSP.price / teamAvg.price) : 0,
            rev: teamAvg.rev > 0 ? pace.unfinishedCSP.rev * (share.avgDailyCSP.rev / teamAvg.rev) : 0,
          };
        } else {
          // Even split fallback when no lookback data
          shareRemaining = CountSizePriceOps.divideBy(pace.unfinishedCSP, assignedCount);
        }

        byServCode.set(pace.servCode.servCodeId, shareRemaining);
      }
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Not-started allocations — servCodes assigned to this employee that haven't
// started yet (category === "notStarted"), with expectedCSP anchored to today.
// Used by EmployeeCard's "Upcoming" collapsible section.
// ---------------------------------------------------------------------------

type NotStartedAllocationsInput = {
  employeeId: string;
};

function makeSelectNotStartedAllocations({ employeeId }: NotStartedAllocationsInput) {
  return createSelector(
    [
      paceSelect.servCodePaces,
      paceSelect.employeeLookbackMap,
      assignmentPlanSelect.assignmentsByEmployeeId,
    ],
    (servCodePaces, lookbackMap, assignmentsByEmployeeId): EmployeeAllocation[] => {
      const priorityOrder = assignmentsByEmployeeId.get(employeeId)?.servCodeIds ?? [];
      const priorityIndex = new Map(priorityOrder.map((id, idx) => [id, idx]));

      // Get the employee's totalAvgDailyCSP (capacity ceiling) from any programType stats
      const employeeLookback = lookbackMap.get(employeeId);
      let totalAvgDailyCSP = { ...baseCountSizePrice };
      if (employeeLookback) {
        for (const stats of employeeLookback.values()) {
          if (stats?.totalAvgDailyCSP) {
            totalAvgDailyCSP = stats.totalAvgDailyCSP;
            break;
          }
        }
      }

      const today = dateStrings.today();
      const allocations: EmployeeAllocation[] = [];

      for (const pace of servCodePaces) {
        // Only notStarted servCodes — those whose window hasn't begun yet
        if (pace.category !== "notStarted") continue;

        // Check if this employee is assigned to this servCode
        const share = pace.employeeShares.find(
          (s) => s.employee.employeeId === employeeId,
        );
        if (!share) continue;

        // daysRemaining is computed from today in ServCodeUtils (servCode.x.daysRemaining).
        // For notStarted servCodes, the window hasn't started yet, so we use the full
        // weekday span from today to the deadline as the denominator.
        const daysLeft = weekdaysRemaining(today, pace.servCode.dateRange.max ?? today);
        const rateAsOfToday = CountSizePriceOps.divideBy(pace.unfinishedCSP, daysLeft || 1);

        // Employee's weighted share of the rate (same weighting logic as makeAllocationsAtDate)
        let expectedCSP = { ...baseCountSizePrice };
        if (share.avgDailyCSP) {
          const teamAvg = CountSizePriceOps.sumAll(
            pace.employeeShares.map((s) => s.avgDailyCSP ?? { ...baseCountSizePrice }),
          );
          expectedCSP = {
            count: teamAvg.count > 0 ? rateAsOfToday.count * (share.avgDailyCSP.count / teamAvg.count) : 0,
            size: teamAvg.size > 0 ? rateAsOfToday.size * (share.avgDailyCSP.size / teamAvg.size) : 0,
            price: teamAvg.price > 0 ? rateAsOfToday.price * (share.avgDailyCSP.price / teamAvg.price) : 0,
            rev: teamAvg.rev > 0 ? rateAsOfToday.rev * (share.avgDailyCSP.rev / teamAvg.rev) : 0,
          };
        } else {
          // Even split fallback
          const assignedCount = pace.employeeShares.length || 1;
          expectedCSP = CountSizePriceOps.divideBy(rateAsOfToday, assignedCount);
        }

        // fractionConsumed = expectedCSP / totalAvgDailyCSP
        const fractionConsumed =
          totalAvgDailyCSP.count > 0 || totalAvgDailyCSP.size > 0
            ? {
                count: totalAvgDailyCSP.count > 0 ? expectedCSP.count / totalAvgDailyCSP.count : 0,
                size: totalAvgDailyCSP.size > 0 ? expectedCSP.size / totalAvgDailyCSP.size : 0,
                price: totalAvgDailyCSP.price > 0 ? expectedCSP.price / totalAvgDailyCSP.price : 0,
                rev: totalAvgDailyCSP.rev > 0 ? expectedCSP.rev / totalAvgDailyCSP.rev : 0,
              }
            : null;

        allocations.push({
          servCode: pace.servCode,
          expectedCSP,
          avgDailyCSP: share.avgDailyCSP,
          fractionConsumed,
        });
      }

      // Sort by priority order (same as makeAllocationsAtDate)
      return allocations.sort((a, b) => {
        const ia = priorityIndex.get(a.servCode.servCodeId) ?? Infinity;
        const ib = priorityIndex.get(b.servCode.servCodeId) ?? Infinity;
        return ia - ib;
      });
    },
  );
}

function makeSelectEmployeeTimelineSegments(employeeId: string) {
  return createSelector(
    [paceSelect.servCodePaces, paceSelect.employeeLookbackMap, selectDateBounds, selectPaceTolerance],
    (servCodePaces, lookbackMap, dateBounds, paceTolerance): TimelineSegment[] => {
      if (!dateBounds) return [];

      // Collect all boundary dates
      const boundarySet = new Set<string>([dateBounds.min, dateBounds.max]);
      for (const pace of servCodePaces) {
        if (pace.servCode.dateRange.min) boundarySet.add(pace.servCode.dateRange.min);
        if (pace.servCode.dateRange.max) boundarySet.add(pace.servCode.dateRange.max);
      }
      const boundaries = [...boundarySet].sort();

      if (boundaries.length < 2) return [];

      // Get totalAvgDailyCSP for this employee
      const employeeLookback = lookbackMap.get(employeeId);
      let totalAvgDailyCSP = { ...baseCountSizePrice };
      if (employeeLookback) {
        for (const stats of employeeLookback.values()) {
          if (stats?.totalAvgDailyCSP) {
            totalAvgDailyCSP = stats.totalAvgDailyCSP;
            break;
          }
        }
      }

      const segments: TimelineSegment[] = [];

      for (let i = 0; i < boundaries.length - 1; i++) {
        const from = boundaries[i];
        const to = boundaries[i + 1];

        // Sample midpoint date for this interval
        const fromMs = new Date(from).getTime();
        const toMs = new Date(to).getTime();
        const midMs = (fromMs + toMs) / 2;
        const midDate = new Date(midMs).toISOString().slice(0, 10);

        // Compute total fraction consumed for this employee on midDate,
        // projecting unfinishedCSP forward from today if midDate is in the future.
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
            : weekdaysRemaining(midDate, pace.servCode.dateRange.max ?? midDate);

          const projectedUnfinished = projectUnfinishedCSP(pace, midDaysAhead);
          const rateAsOfDate = CountSizePriceOps.divideBy(projectedUnfinished, daysLeft || 1);

          let employeeRate = 0;
          if (share.avgDailyCSP && totalAvgDailyCSP.count > 0) {
            const teamAvg = CountSizePriceOps.sumAll(
              pace.employeeShares.map((s) => s.avgDailyCSP ?? { ...baseCountSizePrice }),
            );
            const employeeShare = teamAvg.count > 0
              ? rateAsOfDate.count * (share.avgDailyCSP.count / teamAvg.count)
              : 0;
            employeeRate = totalAvgDailyCSP.count > 0 ? employeeShare / totalAvgDailyCSP.count : 0;
          } else if (totalAvgDailyCSP.count > 0) {
            const assignedCount = pace.employeeShares.length || 1;
            employeeRate = (rateAsOfDate.count / assignedCount) / totalAvgDailyCSP.count;
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

export const employeePaceSelect = {
  mainDate: selectMainDate,
  employeeDates: selectEmployeeDates,
  paceTolerance: selectPaceTolerance,
  showUpcoming: selectShowUpcoming,
  dateBounds: selectDateBounds,
  weekdayBounds: selectWeekdayBounds,
  dateTicks: selectDateTicks,
  makeEffectiveDate: makeSelectEffectiveDate,
  makeAllocationsAtDate: makeSelectEmployeeAllocationsAtDate,
  makeNotStartedAllocations: makeSelectNotStartedAllocations,
  makeTimelineSegments: makeSelectEmployeeTimelineSegments,
  employeeShareRemainingMap: selectEmployeeShareRemainingMap,
};
