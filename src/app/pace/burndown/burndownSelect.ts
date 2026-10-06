import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { PoolDaySnapshot } from "@/app/pace/PaceEngineTypes";
import { CrawlerDay } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";

// ---------------------------------------------------------------------------
// Burndown page selectors
//
// Reads sequenceResults from the engine.
// Synthetic single-member sequences (standalone groups) are shown without the "seq" badge.
// crawlerDays provides the hierarchical day → group → employee data for the accordion table.
// ---------------------------------------------------------------------------

export type BurndownSeries = {
  /** The entity being charted — a sequence (may be synthetic for standalone groups). */
  id: string;
  label: string;
  /** "group" for synthetic single-member sequences; "sequence" for multi-member. */
  kind: "group" | "sequence";
  /**
   * Merged pool history across all member groups (legacy — kept for backward compat).
   * New consumers should use crawlerDays instead.
   */
  poolHistory: PoolDaySnapshot[];
  /** The planned end date for this entity (latest plannedEnd across members). */
  plannedEnd: string | null;
  /** The projected end date from the engine (latest projectedEndDate across members). */
  projectedEndDate: string | null;
  /** Total pool at the start of the season (for the burndown ceiling). */
  totalPool: number;
  /**
   * Hierarchical crawl output for this series — day → group → employee.
   * For synthetic (single-group) sequences: filtered to days where the group appears.
   * For multi-member sequences: filtered to days where any member appears.
   * Use CrawlerDayUtils to further query this data.
   */
  crawlerDays: CrawlerDay[];
  /**
   * The groupId for synthetic single-member sequences (null for multi-member).
   * Used by SeriesDetail to look up group-level data without the sequence layer.
   */
  singleGroupId: string | null;
};

/**
 * All burndown series available for display.
 * One series per SequenceResult — synthetic sequences (standalone groups) get kind: "group".
 */
const selectBurndownSeries = createSelector(
  [paceEngineSelect],
  (engineResult): BurndownSeries[] =>
    engineResult.sequenceResults.map((sequence) => {
      const isSynthetic = sequence.isSynthetic;
      const singleGroupId = isSynthetic && sequence.members[0] ? sequence.members[0].groupId : null;

      // Filter crawlerDays to only those relevant to this series
      const seriesDays = isSynthetic && singleGroupId
        ? CrawlerDayUtils.daysForGroup(engineResult.crawlerDays, singleGroupId)
        : CrawlerDayUtils.daysForSequence(engineResult.crawlerDays, sequence.sequenceId);

      return {
        id: sequence.sequenceId,
        label: sequence.label,
        kind: isSynthetic ? "group" : "sequence",
        poolHistory: sequence.poolHistory,
        plannedEnd: sequence.plannedEnd,
        projectedEndDate: sequence.projectedEndDate,
        totalPool: sequence.totalPool,
        crawlerDays: seriesDays,
        singleGroupId,
      };
    }),
);

/** Map<id, BurndownSeries> for O(1) lookup by sequenceId. */
const selectBurndownSeriesMap = createSelector(
  [selectBurndownSeries],
  (series): Map<string, BurndownSeries> =>
    new Map(series.map((s) => [s.id, s])),
);

export const burndownSelect = {
  burndownSeries: selectBurndownSeries,
  burndownSeriesMap: selectBurndownSeriesMap,
  mainDate: createSelector([paceEngineSelect], (r) => r.mainDate),
  crawlerDays: createSelector([paceEngineSelect], (r) => r.crawlerDays),
};
