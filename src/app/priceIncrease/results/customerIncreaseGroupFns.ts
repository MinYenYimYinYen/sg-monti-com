import { CustomerIncreaseResult, GroupableIncreaseProperties } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";

type GroupFn = (result: CustomerIncreaseResult) => string;

/** Human-readable labels for each group key, used in the group picker UI. */
export const customerIncreaseGroupLabels: Record<keyof GroupableIncreaseProperties, string> = {
  isExempt: "Exempt Status",
  isManual: "Manual Override",
  needsManualAttention: "Manual Attention",
  hasIncreaseFlag: "Increase Flag",
  isOverpriced: "Overpriced",
  isBelowAcquisition: "Below Acquisition",
};

/**
 * Group function registry. TypeScript enforces that every key in
 * GroupableIncreaseProperties has a corresponding group function.
 *
 * Each function returns a string group label for a given CustomerIncreaseResult.
 * The UI uses these labels as tab/section headers.
 */
export const customerIncreaseGroupFns: Record<keyof GroupableIncreaseProperties, GroupFn> = {
  isExempt: (r) => (r.groupable.isExempt ? "Exempt" : "Active"),
  isManual: (r) => (r.groupable.isManual ? "Manual Override" : "Standard"),
  needsManualAttention: (r) => (r.groupable.needsManualAttention ? "Needs Review" : "Normal"),
  hasIncreaseFlag: (r) => (r.groupable.hasIncreaseFlag ? "Has Increase Flag" : "No Flag"),
  isOverpriced: (r) => (r.groupable.isOverpriced ? "Already Overpriced" : "Needs Increase"),
  isBelowAcquisition: (r) =>
    r.groupable.isBelowAcquisition ? "Below Acquisition Price" : "At/Above Acquisition",
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
