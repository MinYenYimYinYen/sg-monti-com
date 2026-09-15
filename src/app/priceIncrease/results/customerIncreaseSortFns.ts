import { CustomerIncreaseResult, SortableIncreaseProperties } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";

type SortFn = (a: CustomerIncreaseResult, b: CustomerIncreaseResult) => number;

export type SortDirection = "asc" | "desc";

/**
 * A sort entry pairing a sort key with a direction.
 * Used in IncreaseViewConfig.sortKeys (ordered list, primary first).
 */
export type SortEntry = {
  key: CustomerIncreaseSortKey;
  direction: SortDirection;
};

/** Human-readable labels for each sort key, used in the sort picker UI. */
export const customerIncreaseSortLabels: Record<keyof SortableIncreaseProperties, string> = {
  increaseDollar: "Increase $",
  increasePercent: "Increase %",
  rawPercent: "Raw %",
  customerRevenue: "Customer Revenue",
  programRevenue: "Program Revenue",
  seasonCount: "Season Count",
};

/**
 * Sort function registry. TypeScript enforces that every key in
 * SortableIncreaseProperties has a corresponding sort function.
 *
 * All functions return a descending comparator value (highest first).
 * Use applySortDirection to flip for ascending.
 */
export const customerIncreaseSortFns: Record<keyof SortableIncreaseProperties, SortFn> = {
  increaseDollar: (a, b) => b.sortable.increaseDollar - a.sortable.increaseDollar,
  increasePercent: (a, b) => b.sortable.increasePercent - a.sortable.increasePercent,
  rawPercent: (a, b) => b.sortable.rawPercent - a.sortable.rawPercent,
  customerRevenue: (a, b) => b.sortable.customerRevenue - a.sortable.customerRevenue,
  programRevenue: (a, b) => b.sortable.programRevenue - a.sortable.programRevenue,
  seasonCount: (a, b) => b.sortable.seasonCount - a.sortable.seasonCount,
};

export type CustomerIncreaseSortKey = keyof SortableIncreaseProperties;

/**
 * Applies direction to a raw descending comparator value.
 * "desc" is a no-op; "asc" negates the value to reverse the order.
 */
export function applySortDirection(cmp: number, direction: SortDirection): number {
  return direction === "asc" ? -cmp : cmp;
}
