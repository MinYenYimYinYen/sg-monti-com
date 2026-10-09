import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";
import { BurndownChartData, BurndownDay, BurndownRechartsData, BurndownRechartsRow, BurndownSlopeAnalysis, BurndownVelocityLine } from "@/app/pace/burndown/burndownTypes";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";

// ---------------------------------------------------------------------------
// Local input selectors
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState): string => state.pace.mainDate;

// ---------------------------------------------------------------------------
// Filled crawler days — every group present on every day (no spikes)
// ---------------------------------------------------------------------------

/**
 * Applies `fillGroupsAcrossAllDays` to the raw crawlerDays.
 *
 * Groups that haven't started yet carry their full totalPool as remaining,
 * and groups that have finished carry 0. This produces a monotonically
 * non-increasing season total — no spikes from cascade unlocks.
 */
const selectFilledCrawlerDays = createSelector(
  [paceEngineSelect.crawlerDays],
  (crawlerDays) => CrawlerDayUtils.fillGroupsAcrossAllDays(crawlerDays),
);

// ---------------------------------------------------------------------------
// Burndown days — one BurndownDay per CrawlerDay
// ---------------------------------------------------------------------------

/**
 * Maps filled crawlerDays to BurndownDay[].
 *
 * Each BurndownDay carries the total poolRemaining across all groups (for the
 * overall burn line) and per-group slices (for stacked bar rendering).
 * Uses filled days so the season total is monotonically non-increasing.
 */
const selectBurndownDays = createSelector(
  [selectFilledCrawlerDays],
  (crawlerDays): BurndownDay[] =>
    crawlerDays.map((day) => ({
      date: day.date,
      phase: day.phase,
      totalRemaining: CrawlerDayUtils.totalRemainingOnDay(day),
      groups: day.groups.map((g) => ({
        groupId: g.groupId,
        label: g.label,
        sequenceId: g.sequenceId,
        remaining: g.poolRemaining,
      })),
    })),
);

// ---------------------------------------------------------------------------
// Velocity line — ideal straight-line burn from day 1 to deadline
// ---------------------------------------------------------------------------

/**
 * Computes the ideal burndown velocity line.
 *
 * Start: first crawlerDay's totalRemaining (the season's full pool).
 * End: snowDeadline if set, otherwise the last crawlerDay's date.
 *
 * Returns null when there are no crawlerDays (engine hasn't run yet).
 */
const selectBurndownVelocityLine = createSelector(
  [selectBurndownDays, paceSeasonPlanSelect.snowDeadline],
  (burndownDays, snowDeadline): BurndownVelocityLine | null => {
    if (burndownDays.length === 0) return null;

    const firstDay = burndownDays[0];
    const lastDay = burndownDays[burndownDays.length - 1];

    return {
      startDate: firstDay.date,
      startRemaining: firstDay.totalRemaining,
      endDate: snowDeadline ?? lastDay.date,
    };
  },
);

// ---------------------------------------------------------------------------
// Chart data — everything the burndown chart component needs
// ---------------------------------------------------------------------------

/**
 * Assembles all burndown chart data into a single object.
 *
 * Inputs:
 *   - crawlerDays (via paceEngineSelect) — the computed timeline
 *   - snowMelt / snowDeadline (via paceSeasonPlanSelect) — season boundaries
 *   - mainDate (from paceSlice) — the vertical "as of" line
 */
const selectBurndownChartData = createSelector(
  [selectBurndownDays, selectBurndownVelocityLine, selectMainDate, paceSeasonPlanSelect.snowMelt, paceSeasonPlanSelect.snowDeadline],
  (burndownDays, velocityLine, mainDate, snowMelt, snowDeadline): BurndownChartData => ({
    days: burndownDays,
    velocityLine,
    mainDate,
    snowMelt,
    snowDeadline,
  }),
);

// ---------------------------------------------------------------------------
// Recharts-ready flat pivot — one row per day, one key per group
// ---------------------------------------------------------------------------

/**
 * Pivots BurndownDay[] into the flat row format Recharts expects for stacked bars.
 *
 * Each row has:
 *   - `date`, `phase`, `totalRemaining` — standard fields
 *   - `velocityRemaining` — linearly interpolated ideal value for this date
 *   - one key per groupId — the group's poolRemaining on that day (0 if absent)
 *
 * Group order is stable: derived from the first day that has any groups.
 */
const selectBurndownRechartsData = createSelector(
  [selectBurndownDays, selectBurndownVelocityLine, selectMainDate, paceSeasonPlanSelect.snowMelt, paceSeasonPlanSelect.snowDeadline, paceEngineSelect.groupEffectiveDateRanges, paceEngineSelect.crawlerDays],
  (burndownDays, velocityLine, mainDate, snowMelt, snowDeadline, groupDateRanges, crawlerDays): BurndownRechartsData => {
    if (burndownDays.length === 0) {
      return { rows: [], groupKeys: [], groupLabels: new Map(), groupDateRanges: new Map(), mainDate, snowMelt, snowDeadline };
    }

    // Collect stable ordered group keys and labels from the raw (unfilled) crawler days,
    // which preserve the engine's original sequence/schedule order.
    const groupLabels = new Map<string, string>();
    const groupKeyOrder: string[] = [];
    for (const day of crawlerDays) {
      for (const group of day.groups) {
        if (!groupLabels.has(group.groupId)) {
          groupLabels.set(group.groupId, group.label);
          groupKeyOrder.push(group.groupId);
        }
      }
    }

    // Precompute velocity line slope for interpolation (weekday-based)
    let velocitySlope = 0;
    let velocityStartRemaining = 0;
    let velocityStartDate = "";
    let velocityEndDate = "";
    if (velocityLine) {
      velocityStartDate = velocityLine.startDate;
      velocityEndDate = velocityLine.endDate;
      velocityStartRemaining = velocityLine.startRemaining;
      const totalWeekdays = dateRanges.countWeekdays({ min: velocityStartDate, max: velocityEndDate });
      velocitySlope = totalWeekdays > 0 ? -velocityStartRemaining / totalWeekdays : 0;
    }

    const rows: BurndownRechartsRow[] = burndownDays.map((day) => {
      // Build flat group keys
      const groupRemainingByKey: Record<string, number> = {};
      for (const groupId of groupKeyOrder) {
        groupRemainingByKey[groupId] = 0;
      }
      for (const group of day.groups) {
        groupRemainingByKey[group.groupId] = group.remaining;
      }

      // Interpolate velocity line value for this date (weekday-based)
      let velocityRemaining: number | null = null;
      if (velocityLine && day.date >= velocityStartDate && day.date <= velocityEndDate) {
        const weekdaysElapsed = dateRanges.countWeekdays({ min: velocityStartDate, max: day.date });
        velocityRemaining = Math.max(0, velocityStartRemaining + velocitySlope * weekdaysElapsed);
      }

      const row: BurndownRechartsRow = {
        date: day.date,
        phase: day.phase,
        totalRemaining: day.totalRemaining,
        velocityRemaining,
        ...groupRemainingByKey,
      };
      return row;
    });

    return {
      rows,
      groupKeys: groupKeyOrder,
      groupLabels,
      groupDateRanges,
      mainDate,
      snowMelt,
      snowDeadline,
    };
  },
);

// ---------------------------------------------------------------------------
// Slope analysis — plain function (not a selector, windowDays is local state)
// ---------------------------------------------------------------------------

/**
 * Computes the N-day slope analysis centered on mainDate.
 *
 * Look-back: finds the past-phase day N days before mainDate (by calendar days,
 * not weekday count — the burndown array only has weekdays, so we walk back
 * through the array to find the Nth past-phase entry).
 *
 * Look-forward: projects the actual slope N calendar days past mainDate to
 * produce the end point of the slope line.
 *
 * Returns null slopeLine when there are fewer than N past-phase days available.
 */
export function computeSlopeAnalysis(
  burndownDays: BurndownDay[],
  velocityLine: BurndownVelocityLine | null,
  mainDate: string,
  windowDays: number,
): BurndownSlopeAnalysis {
  const velocityWeekdays = velocityLine
    ? dateRanges.countWeekdays({ min: velocityLine.startDate, max: velocityLine.endDate })
    : 0;
  const idealDailyBurn = velocityWeekdays > 0 ? velocityLine!.startRemaining / velocityWeekdays : 0;

  // Find the present day and collect past-phase days in order
  const pastDays = burndownDays.filter((d) => d.phase === "past" || d.phase === "present");
  const presentIndex = pastDays.findIndex((d) => d.date === mainDate);
  const presentDay = presentIndex >= 0 ? pastDays[presentIndex] : pastDays[pastDays.length - 1];

  if (!presentDay || pastDays.length < 2) {
    return {
      windowDays,
      windowStartDate: mainDate,
      windowEndDate: mainDate,
      actualDailyBurn: 0,
      idealDailyBurn,
      variance: -idealDailyBurn,
      variancePct: -1,
      slopeLine: null as null,
    };
  }

  // Walk back N past-phase entries from the present day
  const presentIdx = pastDays.indexOf(presentDay);
  const lookbackIdx = Math.max(0, presentIdx - windowDays);
  const windowStartDay = pastDays[lookbackIdx];
  const actualWindowDays = presentIdx - lookbackIdx;

  const actualDailyBurn =
    actualWindowDays > 0
      ? (windowStartDay.totalRemaining - presentDay.totalRemaining) / actualWindowDays
      : 0;

  const variance = actualDailyBurn - idealDailyBurn;
  const variancePct = idealDailyBurn > 0 ? variance / idealDailyBurn : 0;

  // Project slope forward using the same weekday-based actualDailyBurn rate.
  // The pivot is pinned to mainDate's totalRemaining so the line always passes
  // through the top of the mainDate bar regardless of window size.
  // Start point is projected backward from the pivot using the actual slope.
  //
  // Both segments use weekday count (not calendar days) so the slopes match exactly.
  // The burndownDays array contains only weekdays, so future-phase entries are the
  // forward weekday count.
  const futureDays = burndownDays.filter((d) => d.date > mainDate);
  const lastDay = burndownDays[burndownDays.length - 1];
  const pivotRemaining = presentDay.totalRemaining;
  const startRemaining = pivotRemaining + actualDailyBurn * actualWindowDays;

  let windowEndDate: string;
  let windowEndRemaining: number;

  if (actualDailyBurn > 0) {
    // Find the zero-crossing weekday index
    const weekdaysToZero = pivotRemaining / actualDailyBurn;
    const zeroCrossingIdx = Math.floor(weekdaysToZero);

    if (zeroCrossingIdx < futureDays.length) {
      // Team finishes before the end of the chart — terminate at the zero-crossing weekday
      windowEndDate = futureDays[zeroCrossingIdx].date;
      windowEndRemaining = 0;
    } else {
      // Team won't finish by end of chart — extend to last day with positive remaining
      windowEndDate = lastDay.date;
      windowEndRemaining = pivotRemaining - actualDailyBurn * futureDays.length;
    }
  } else {
    // No burn rate — flat line to end of chart
    windowEndDate = lastDay.date;
    windowEndRemaining = pivotRemaining;
  }

  const slopeLine =
    actualWindowDays > 0
      ? {
          startDate: windowStartDay.date,
          startRemaining,
          pivotDate: mainDate,
          pivotRemaining,
          endDate: windowEndDate,
          endRemaining: windowEndRemaining,
        }
      : null;

  return {
    windowDays,
    windowStartDate: windowStartDay.date,
    windowEndDate,
    actualDailyBurn,
    idealDailyBurn,
    variance,
    variancePct,
    slopeLine,
  };
}

// ---------------------------------------------------------------------------
// Selection state selectors
// ---------------------------------------------------------------------------

const selectSelectedDate = (state: AppState): string | null => state.burndown.selectedDate;
const selectSelectedGroupId = (state: AppState): string | null => state.burndown.selectedGroupId;

/**
 * The full BurndownRechartsRow for the currently selected date, or null.
 * Used by BarDetail to display per-group breakdown.
 */
const selectSelectedRow = createSelector(
  [selectBurndownRechartsData, selectSelectedDate],
  (rechartsData, selectedDate): BurndownRechartsRow | null => {
    if (!selectedDate) return null;
    return rechartsData.rows.find((row) => row.date === selectedDate) ?? null;
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const burndownSelect = {
  burndownDays: selectBurndownDays,
  velocityLine: selectBurndownVelocityLine,
  chartData: selectBurndownChartData,
  rechartsData: selectBurndownRechartsData,
  selectedDate: selectSelectedDate,
  selectedGroupId: selectSelectedGroupId,
  selectedRow: selectSelectedRow,
};
