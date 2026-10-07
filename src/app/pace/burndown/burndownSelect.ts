import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";
import { BurndownChartData, BurndownDay, BurndownVelocityLine } from "@/app/pace/burndown/burndownTypes";

// ---------------------------------------------------------------------------
// Local input selectors
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState): string => state.pace.mainDate;

// ---------------------------------------------------------------------------
// Burndown days — one BurndownDay per CrawlerDay
// ---------------------------------------------------------------------------

/**
 * Maps crawlerDays to BurndownDay[].
 *
 * Each BurndownDay carries the total poolRemaining across all groups (for the
 * overall burn line) and per-group slices (for stacked bar rendering).
 */
const selectBurndownDays = createSelector(
  [paceEngineSelect.crawlerDays],
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
// Export
// ---------------------------------------------------------------------------

export const burndownSelect = {
  burndownDays: selectBurndownDays,
  velocityLine: selectBurndownVelocityLine,
  chartData: selectBurndownChartData,
};
