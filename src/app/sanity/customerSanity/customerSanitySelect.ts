import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerSanitySortMode, CustomerSanitySortDirection } from "@/app/sanity/sanitySlice";

// Programs are already filtered by excludedProgCodeIds and active status in sanitySelect.
// buildComboKey simply joins all program IDs — no further filtering needed here.
function buildComboKey(customer: Customer): string {
  const ids = customer.programs
    .map((p) => p.progCode.progCodeId)
    .sort();
  return ids.join("|");
}

const selectSortMode = (state: AppState): CustomerSanitySortMode =>
  state.sanity.customerSanityPage.sortMode;

const selectSortDirection = (state: AppState): CustomerSanitySortDirection =>
  state.sanity.customerSanityPage.sortDirection;

// Uses centralSelect (unfiltered) so excluded prog codes remain visible in the
// filter UI and can be toggled back on. The grouping uses sanitySelect (filtered).
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
  [sanitySelect.customers],
  (customers) =>
    new Grouper(customers).groupBy((c) => buildComboKey(c)).toMap(),
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
  excludedProgCodeIds: sanitySelect.excludedProgCodeIds,
  sortMode: selectSortMode,
  sortDirection: selectSortDirection,
  allProgCodeIds: selectAllProgCodeIds,
  visibleGroups: selectVisibleGroups,
};
