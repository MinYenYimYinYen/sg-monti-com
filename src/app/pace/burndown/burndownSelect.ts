import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";
import { BurndownChartData, BurndownDay, BurndownRechartsData, BurndownRechartsRow, BurndownVelocityLine } from "@/app/pace/burndown/burndownTypes";

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
  [selectBurndownDays, selectBurndownVelocityLine, selectMainDate, paceSeasonPlanSelect.snowMelt, paceSeasonPlanSelect.snowDeadline],
  (burndownDays, velocityLine, mainDate, snowMelt, snowDeadline): BurndownRechartsData => {
    if (burndownDays.length === 0) {
      return { rows: [], groupKeys: [], groupLabels: new Map(), mainDate, snowMelt, snowDeadline };
    }

    // Collect stable ordered group keys and labels from all days
    const groupLabels = new Map<string, string>();
    const groupKeyOrder: string[] = [];
    for (const day of burndownDays) {
      for (const group of day.groups) {
        if (!groupLabels.has(group.groupId)) {
          groupLabels.set(group.groupId, group.label);
          groupKeyOrder.push(group.groupId);
        }
      }
    }

    // Precompute velocity line slope for interpolation
    let velocitySlope = 0;
    let velocityStartRemaining = 0;
    let velocityStartDate = "";
    let velocityEndDate = "";
    if (velocityLine) {
      velocityStartDate = velocityLine.startDate;
      velocityEndDate = velocityLine.endDate;
      velocityStartRemaining = velocityLine.startRemaining;
      // Days between start and end (approximate using string comparison for ISO dates)
      const msPerDay = 86_400_000;
      const totalMs = new Date(velocityEndDate).getTime() - new Date(velocityStartDate).getTime();
      const totalDays = totalMs / msPerDay;
      velocitySlope = totalDays > 0 ? -velocityStartRemaining / totalDays : 0;
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

      // Interpolate velocity line value for this date
      let velocityRemaining: number | null = null;
      if (velocityLine) {
        const msPerDay = 86_400_000;
        const dayMs = new Date(day.date).getTime();
        const startMs = new Date(velocityStartDate).getTime();
        const endMs = new Date(velocityEndDate).getTime();
        if (dayMs >= startMs && dayMs <= endMs) {
          const daysElapsed = (dayMs - startMs) / msPerDay;
          velocityRemaining = Math.max(0, velocityStartRemaining + velocitySlope * daysElapsed);
        }
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
      mainDate,
      snowMelt,
      snowDeadline,
    };
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
};
