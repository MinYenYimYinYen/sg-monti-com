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

const selectFinishedCustIds = (state: AppState): number[] =>
  state.sanity.customerSanityPage.finishedCustIds;

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

/** All groups regardless of finished state — used to build the finished list. */
const selectAllGroups = createSelector(
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

/** Groups with finished customers filtered out. Groups that become empty are dropped. */
const selectVisibleGroups = createSelector(
  [selectAllGroups, selectFinishedCustIds],
  (groups, finishedIds): CustomerComboGroup[] => {
    if (finishedIds.length === 0) return groups;
    const finishedSet = new Set(finishedIds);
    return groups
      .map((group) => ({
        ...group,
        customers: group.customers.filter((c) => !finishedSet.has(c.custId)),
      }))
      .filter((group) => group.customers.length > 0)
      .map((group) => ({ ...group, count: group.customers.length }));
  },
);

/** Finished customers — shown in the finished popover. */
const selectFinishedCustomers = createSelector(
  [selectCustomerGroupMap, selectFinishedCustIds],
  (map, finishedIds): Customer[] => {
    if (finishedIds.length === 0) return [];
    const finishedSet = new Set(finishedIds);
    const all = [...map.values()].flat();
    return all.filter((c) => finishedSet.has(c.custId));
  },
);

const selectFinishedCount = createSelector(
  [selectFinishedCustIds],
  (ids) => ids.length,
);

export const customerSanitySelect = {
  excludedProgCodeIds: sanitySelect.excludedProgCodeIds,
  sortMode: selectSortMode,
  sortDirection: selectSortDirection,
  allProgCodeIds: selectAllProgCodeIds,
  visibleGroups: selectVisibleGroups,
  finishedCustIds: selectFinishedCustIds,
  finishedCustomers: selectFinishedCustomers,
  finishedCount: selectFinishedCount,
};
