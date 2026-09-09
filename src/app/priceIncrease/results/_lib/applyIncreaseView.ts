import { CustomerIncreaseResult } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";
import { customerIncreaseSortFns } from "@/app/priceIncrease/results/customerIncreaseSortFns";
import {
  customerIncreaseGroupFns,
  CustomerIncreaseGroupKey,
  groupCustomerIncreaseResults,
} from "@/app/priceIncrease/results/customerIncreaseGroupFns";
import { IncreaseViewConfig } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";

export type AppliedIncreaseView =
  | { grouped: false; results: CustomerIncreaseResult[] }
  | {
      grouped: true;
      groups: Map<string, CustomerIncreaseResult[]>;
      activeGroup: string;
      activeResults: CustomerIncreaseResult[];
    };

/**
 * Applies sort and group configuration to a flat CustomerIncreaseResult array.
 *
 * Sort: applies sortKeys in priority order (primary first, tiebreakers after).
 * Group: partitions the sorted results by groupKey. When grouped, returns the
 * active group's results for rendering. If activeGroup is null or not found,
 * defaults to the first group.
 *
 * Returns a discriminated union so callers can render group tabs only when
 * grouping is active.
 */
export function applyIncreaseView(
  results: CustomerIncreaseResult[],
  viewConfig: IncreaseViewConfig,
): AppliedIncreaseView {
  const { sortKeys, groupKey, activeGroup } = viewConfig;

  // Apply multi-sort
  const sorted = [...results].sort((a, b) => {
    for (const key of sortKeys) {
      const cmp = customerIncreaseSortFns[key](a, b);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  if (!groupKey) {
    return { grouped: false, results: sorted };
  }

  const groups = groupCustomerIncreaseResults(sorted, groupKey);

  // Determine active group — default to first group if activeGroup is null or stale
  const groupLabels = Array.from(groups.keys());
  const resolvedActiveGroup =
    activeGroup && groups.has(activeGroup) ? activeGroup : (groupLabels[0] ?? "");

  const activeResults = groups.get(resolvedActiveGroup) ?? [];

  return {
    grouped: true,
    groups,
    activeGroup: resolvedActiveGroup,
    activeResults,
  };
}
