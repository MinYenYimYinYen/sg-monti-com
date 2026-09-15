import { CustomerIncreaseResult, GroupableIncreaseProperties, PreExistingFlagStatus } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";

type GroupFn = (result: CustomerIncreaseResult) => string;

const preExistingFlagStatusLabels: Record<PreExistingFlagStatus, string> = {
  none: "No Existing Flag",
  matching: "Matching Flag",
  override: "Override",
  conflict: "Conflict — Resolve Required",
};

// ---------------------------------------------------------------------------
// Season count bucketing
// ---------------------------------------------------------------------------

/**
 * Returns a display-ready bucket label for a season count.
 *
 * Bucketing rules:
 * - Seasons 1 through configSeasonCount: individual labels ("Season 1", "Season 2", ...)
 * - Seasons configSeasonCount+1 through the next multiple of 5: one bucket (e.g., "Seasons 7–10")
 * - Then 5-year ranges: "Seasons 11–15", "Seasons 16–20", ...
 *
 * When configSeasonCount is 0 (fallback / no active config), every season gets its own label.
 */
export function getSeasonCountBucket(seasonCount: number, configSeasonCount: number): string {
  if (configSeasonCount === 0 || seasonCount <= configSeasonCount) {
    return `Season ${seasonCount}`;
  }

  // Find the next multiple of 5 at or above configSeasonCount + 1
  const firstRangeStart = configSeasonCount + 1;
  const firstRangeEnd = Math.ceil(firstRangeStart / 5) * 5;

  if (seasonCount <= firstRangeEnd) {
    return `Seasons ${firstRangeStart}–${firstRangeEnd}`;
  }

  // 5-year ranges beyond the first range
  const rangeIndex = Math.floor((seasonCount - firstRangeEnd - 1) / 5);
  const rangeStart = firstRangeEnd + rangeIndex * 5 + 1;
  const rangeEnd = rangeStart + 4;
  return `Seasons ${rangeStart}–${rangeEnd}`;
}

/** Human-readable labels for each group key, used in the group picker UI. */
export const customerIncreaseGroupLabels: Record<keyof GroupableIncreaseProperties, string> = {
  isExempt: "Exempt Status",
  isManual: "Manual Price Increase",
  needsManualAttention: "Manual Attention",
  hasIncreaseFlag: "Increase Flag",
  isOverpriced: "Overpriced",
  isBelowAcquisition: "Below Acquisition",
  resolvedFlagDesc: "Resolved Flag",
  preExistingFlagStatus: "Pre-existing Flag Status",
  seasonCountBucket: "Season",
};

/**
 * Group function registry. TypeScript enforces that every key in
 * GroupableIncreaseProperties has a corresponding group function.
 *
 * Each function returns a string group label for a given CustomerIncreaseResult.
 * The UI uses these labels as tab/section headers.
 *
 * Note: seasonCountBucket uses the pre-computed bucket label from groupable,
 * which is populated by customerIncreaseResultsSelect using the active config's
 * season count. The registry entry simply reads that pre-computed value.
 */
export const customerIncreaseGroupFns: Record<keyof GroupableIncreaseProperties, GroupFn> = {
  isExempt: (r) => (r.groupable.isExempt ? "Exempt" : "Active"),
  isManual: (r) => (r.groupable.isManual ? "Manual Price Increase" : "Standard"),
  needsManualAttention: (r) => (r.groupable.needsManualAttention ? "Needs Review" : "Normal"),
  hasIncreaseFlag: (r) => (r.groupable.hasIncreaseFlag ? "Has Increase Flag" : "No Flag"),
  isOverpriced: (r) => (r.groupable.isOverpriced ? "Already Overpriced" : "Needs Increase"),
  isBelowAcquisition: (r) =>
    r.groupable.isBelowAcquisition ? "Below Acquisition Price" : "At/Above Acquisition",
  resolvedFlagDesc: (r) => r.groupable.resolvedFlagDesc,
  preExistingFlagStatus: (r) => preExistingFlagStatusLabels[r.groupable.preExistingFlagStatus],
  seasonCountBucket: (r) => r.groupable.seasonCountBucket,
};

export type CustomerIncreaseGroupKey = keyof GroupableIncreaseProperties;

/**
 * Groups a flat array of CustomerIncreaseResult into a Map<groupLabel, results[]>.
 * Preserves the order of first appearance for group labels.
 */
export function groupCustomerIncreaseResults(
  results: CustomerIncreaseResult[],
  groupKey: CustomerIncreaseGroupKey,
): Map<string, CustomerIncreaseResult[]> {
  const groupFn = customerIncreaseGroupFns[groupKey];
  const grouped = new Map<string, CustomerIncreaseResult[]>();

  for (const result of results) {
    const label = groupFn(result);
    const existing = grouped.get(label);
    if (existing) {
      existing.push(result);
    } else {
      grouped.set(label, [result]);
    }
  }

  return grouped;
}
