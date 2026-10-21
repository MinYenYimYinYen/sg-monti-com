import { createSelector } from "@reduxjs/toolkit";
import { selectPaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { runPaceEngine } from "@/app/pace/lib/runPaceEngine";
import { PaceEngineResult } from "@/app/pace/lib/PaceEngineTypes";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";

/**
 * The single Redux selector that runs the pace engine.
 *
 * This is the only memoization boundary for the engine.
 * It assembles all inputs via `selectPaceEngineInputs` and calls `runPaceEngine()`.
 *
 * If any input changes, the engine re-runs in full — all phases are a pipeline
 * and there is no valid intermediate cache point.
 *
 * Sub-page selectors (ganttSelect, employeePlanSelect, etc.) memoize their own
 * derived slices from this result.
 */
const selectPaceEngineResult = createSelector(
  [selectPaceEngineInputs],
  (inputs): PaceEngineResult => runPaceEngine(inputs),
);

const selectCrawlerDays = createSelector(
  [selectPaceEngineResult],
  (result) => result.crawlerDays,
);

const selectUrgentGroups = createSelector(
  [selectPaceEngineResult],
  (result) => result.urgentGroups,
);

/** Map<groupId, { effectiveStart, effectiveEnd }> — derived from raw crawlerDays.
 *  Straggler groups (overdue urgentGroups) have their effectiveEnd capped at the
 *  last past-phase day they were actually worked, preventing the engine's forward
 *  projection from inflating the displayed date range.
 */
const selectGroupEffectiveDateRanges = createSelector(
  [selectCrawlerDays, selectUrgentGroups],
  (crawlerDays, urgentGroups): Map<string, { effectiveStart: string; effectiveEnd: string }> => {
    const stragglerGroupIds = new Set(
      urgentGroups
        .filter((g) => g.reason.kind === "overdue")
        .map((g) => g.groupId),
    );
    return CrawlerDayUtils.getGroupEffectiveDateRanges(crawlerDays, stragglerGroupIds);
  },
);

export const paceEngineSelect = {
  paceEngineResult: selectPaceEngineResult,
  crawlerDays: selectCrawlerDays,
  urgentGroups: selectUrgentGroups,
  groupEffectiveDateRanges: selectGroupEffectiveDateRanges,
};
