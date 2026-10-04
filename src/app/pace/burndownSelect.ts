import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { PoolDaySnapshot } from "@/app/pace/PaceEngineTypes";

// ---------------------------------------------------------------------------
// Burndown page selectors
//
// Reads sequenceResults from the engine.
// Each SequenceResult already has a merged poolHistory across all member groups.
// Synthetic single-member sequences (standalone groups) are shown without the "seq" badge.
// ---------------------------------------------------------------------------

export type BurndownSeries = {
  /** The entity being charted — a sequence (may be synthetic for standalone groups). */
  id: string;
  label: string;
  /** "group" for synthetic single-member sequences; "sequence" for multi-member. */
  kind: "group" | "sequence";
  /** Merged pool history across all member groups (already computed by the engine). */
  poolHistory: PoolDaySnapshot[];
  /** The planned end date for this entity (latest plannedEnd across members). */
  plannedEnd: string | null;
  /** The projected end date from the engine (latest projectedEndDate across members). */
  projectedEndDate: string | null;
  /** Total pool at the start of the season (for the burndown ceiling). */
  totalPool: number;
};

/**
 * All burndown series available for display.
 * One series per SequenceResult — synthetic sequences (standalone groups) get kind: "group".
 * The engine already merged pool histories; no re-derivation needed here.
 */
const selectBurndownSeries = createSelector(
  [paceEngineSelect],
  (engineResult): BurndownSeries[] =>
    engineResult.sequenceResults.map((sequence) => ({
      id: sequence.sequenceId,
      label: sequence.label,
      kind: sequence.isSynthetic ? "group" : "sequence",
      poolHistory: sequence.poolHistory,
      plannedEnd: sequence.plannedEnd,
      projectedEndDate: sequence.projectedEndDate,
      totalPool: sequence.totalPool,
    })),
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
};
