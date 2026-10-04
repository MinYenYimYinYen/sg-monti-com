import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { PoolDaySnapshot } from "@/app/pace/PaceEngineTypes";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

// ---------------------------------------------------------------------------
// Burndown page selectors
//
// Reads groups[].poolHistory from the engine.
// For a GroupSequence, merges member groups' histories by summing snapshots
// on matching dates.
//
// Open UI question (deferred to implementation):
//   For a GroupSequence burndown chart, should member groups be displayed as
//   STACKED BANDS (showing which group in the sequence is the bottleneck) or
//   as a SINGLE COMBINED LINE (total remaining — simpler, better for the
//   "are we going to make it?" question)?
//   The poolHistory data shape supports both. Decide at implementation time.
// ---------------------------------------------------------------------------

export type BurndownSeries = {
  /** The entity being charted — a single group or a full sequence. */
  id: string;
  label: string;
  kind: "group" | "sequence";
  /** Merged/summed pool history across all member groups. */
  poolHistory: PoolDaySnapshot[];
  /** The planned end date for this entity (latest plannedEnd across members). */
  plannedEnd: string | null;
  /** The projected end date from the engine (latest projectedEndDate across members). */
  projectedEndDate: string | null;
  /** Total pool at the start of the season (for the burndown ceiling). */
  totalPool: number;
};

/**
 * Merges multiple groups' poolHistory arrays by summing snapshots on matching dates.
 * Dates that appear in some but not all groups are included with partial sums.
 */
function mergePoolHistories(histories: PoolDaySnapshot[][]): PoolDaySnapshot[] {
  const byDate = new Map<string, { completed: number; remaining: number; priceCompleted: number; priceForecasted: number; employeesWorking: string[]; percentCompleted: number }>();

  for (const history of histories) {
    for (const snapshot of history) {
      const existing = byDate.get(snapshot.date) ?? { completed: 0, remaining: 0, priceCompleted: 0, priceForecasted: 0, employeesWorking: [], percentCompleted: 0 };
      const mergedEmployees = [...new Set([...existing.employeesWorking, ...snapshot.employeesWorking])];
      const mergedCompleted = existing.completed + snapshot.completed;
      const mergedRemaining = existing.remaining + snapshot.remaining;
      byDate.set(snapshot.date, {
        completed: mergedCompleted,
        remaining: mergedRemaining,
        priceCompleted: existing.priceCompleted + snapshot.priceCompleted,
        priceForecasted: existing.priceForecasted + snapshot.priceForecasted,
        employeesWorking: mergedEmployees,
        percentCompleted: (mergedCompleted + mergedRemaining) > 0 ? mergedCompleted / (mergedCompleted + mergedRemaining) : 0,
      });
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { completed, remaining, priceCompleted, priceForecasted, employeesWorking, percentCompleted }]) => ({
      date,
      completed,
      remaining,
      priceCompleted,
      priceForecasted,
      employeesWorking,
      percentCompleted,
    }));
}

/**
 * All burndown series available for display.
 * Includes one series per group AND one series per GroupSequence.
 * The UI can let the user pick which to display.
 */
const selectBurndownSeries = createSelector(
  [paceEngineSelect, paceGroupSequenceSelect.sequences],
  (engineResult, sequences): BurndownSeries[] => {
    const { groups } = engineResult;
    const series: BurndownSeries[] = [];

    // One series per individual group
    for (const group of groups) {
      series.push({
        id: group.groupId,
        label: group.label,
        kind: "group",
        poolHistory: group.poolHistory,
        plannedEnd: group.plannedEnd,
        projectedEndDate: group.projectedEndDate,
        totalPool: group.totalPool,
      });
    }

    // One series per GroupSequence (merged across member groups)
    for (const sequence of sequences) {
      const memberGroups = sequence.groupIds
        .map((groupId) => groups.find((g) => g.groupId === groupId))
        .filter((g): g is NonNullable<typeof g> => g !== undefined);

      if (memberGroups.length === 0) continue;

      const mergedHistory = mergePoolHistories(memberGroups.map((g) => g.poolHistory));

      const plannedEnds = memberGroups
        .map((g) => g.plannedEnd)
        .filter((d): d is string => d !== null);
      const projectedEnds = memberGroups
        .map((g) => g.projectedEndDate)
        .filter((d): d is string => d !== null);

      series.push({
        id: sequence.sequenceId,
        label: sequence.label,
        kind: "sequence",
        poolHistory: mergedHistory,
        plannedEnd: plannedEnds.length > 0 ? [...plannedEnds].sort().at(-1)! : null,
        projectedEndDate: projectedEnds.length > 0 ? [...projectedEnds].sort().at(-1)! : null,
        totalPool: memberGroups.reduce((sum, g) => sum + g.totalPool, 0),
      });
    }

    return series;
  },
);

/** Map<id, BurndownSeries> for O(1) lookup by groupId or sequenceId. */
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
