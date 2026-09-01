import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerSanitySortMode, CustomerSanitySortDirection } from "@/app/sanity/sanitySlice";

const selectExcludedProgCodeIds = (state: AppState) =>
  state.sanity.customerSanity.excludedProgCodeIds;

const selectSortMode = (state: AppState): CustomerSanitySortMode =>
  state.sanity.customerSanity.sortMode;

const selectSortDirection = (state: AppState): CustomerSanitySortDirection =>
  state.sanity.customerSanity.sortDirection;

/** Sorted, pipe-joined progCodeId string for a customer's active (status "9") programs, excluding any excluded IDs. */
function buildComboKey(customer: Customer, excludedIds: string[]): string {
  const ids = customer.programs
    .filter((p) => p.status === "9")
    .map((p) => p.progCode.progCodeId)
    .filter((id) => !excludedIds.includes(id))
    .sort();
  return ids.join("|");
}

/** All unique progCodeIds from active (status "9") programs across all customers, sorted alphabetically. */
const selectAllProgCodeIds = createSelector(
  [centralSelect.customers],
  (customers): string[] => {
    const ids = new Set<string>();
    for (const customer of customers) {
      for (const program of customer.programs.filter((p) => p.status === "9")) {
        ids.add(program.progCode.progCodeId);
      }
    }
    return [...ids].sort();
  },
);

const selectCustomerGroupMap = createSelector(
  [centralSelect.customers, selectExcludedProgCodeIds],
  (customers, excludedIds) =>
    new Grouper(customers).groupBy((c) => buildComboKey(c, excludedIds)).toMap(),
);

export type CustomerComboGroup = {
  comboKey: string;
  customers: Customer[];
  count: number;
  progCodeCount: number;
};

const selectVisibleGroups = createSelector(
  [selectCustomerGroupMap, selectSortMode, selectSortDirection],
  (map, sortMode, sortDirection): CustomerComboGroup[] => {
    const groups: CustomerComboGroup[] = [...map.entries()].map(([comboKey, customers]) => ({
      comboKey,
      customers,
      count: customers.length,
      progCodeCount: comboKey === "" ? 0 : comboKey.split("|").length,
    }));

    const dir = sortDirection === "asc" ? 1 : -1;

    if (sortMode === "byCustomerCount") {
      return groups.sort(
        (a, b) =>
          dir * (a.count - b.count) ||
          dir * (a.progCodeCount - b.progCodeCount) ||
          a.comboKey.localeCompare(b.comboKey),
      );
    }

    // byProgCodeCount
    return groups.sort(
      (a, b) =>
        dir * (a.progCodeCount - b.progCodeCount) ||
        dir * (a.count - b.count) ||
        a.comboKey.localeCompare(b.comboKey),
    );
  },
);

export const customerSanitySelect = {
  excludedProgCodeIds: selectExcludedProgCodeIds,
  sortMode: selectSortMode,
  sortDirection: selectSortDirection,
  allProgCodeIds: selectAllProgCodeIds,
  visibleGroups: selectVisibleGroups,
};
