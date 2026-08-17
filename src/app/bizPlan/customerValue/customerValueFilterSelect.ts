import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

/** Status codes that count as "active" for customer value purposes. */
export const ACTIVE_SERVICE_STATUSES = new Set(["Y", "*", "S", "$"]);

const selectSelectedZips = (state: AppState): string[] | null =>
  state.customerValueFilter.selectedZips;

/**
 * Active customers: status === "9" AND at least one service with a qualifying status
 * from an active program (program.status === "9").
 * This is the base dataset for all customerValue pages.
 */
const selectActiveCustomers = createSelector(
  [centralSelect.customers],
  (customers): Customer[] =>
    customers.filter((customer) => {
      if (customer.status !== "9") return false;
      return customer.x.services.some(
        (service) =>
          ACTIVE_SERVICE_STATUSES.has(service.status) &&
          service.program.status === "9",
      );
    }),
);

/**
 * Sorted list of all zip codes present in the active customer set.
 * Used to populate the ZipCodeFilter panel.
 */
const selectAllZipCodes = createSelector(
  [selectActiveCustomers],
  (customers): string[] => {
    const zips = new Set(customers.map((c) => c.address.zip ?? "").filter(Boolean));
    return [...zips].sort();
  },
);

/**
 * Active customers filtered to the currently selected zip codes.
 * null = uninitialized (show all). [] = user selected none (show nothing).
 * This is the shared input for byZipCodeSelect and byProgramSelect.
 */
const selectFilteredCustomers = createSelector(
  [selectActiveCustomers, selectSelectedZips],
  (customers, selectedZips): Customer[] => {
    if (selectedZips === null) return customers;
    if (selectedZips.length === 0) return [];
    const zipSet = new Set(selectedZips);
    return customers.filter((c) => zipSet.has(c.address.zip ?? ""));
  },
);

/**
 * Customers grouped by zip — used by ZipCodeFilter to show customer counts per zip.
 */
const selectCustomerCountByZip = createSelector(
  [selectActiveCustomers],
  (customers): Map<string, number> => {
    const map = new Map<string, number>();
    for (const customer of customers) {
      const zip = customer.address.zip ?? "";
      if (zip) map.set(zip, (map.get(zip) ?? 0) + 1);
    }
    return map;
  },
);

/**
 * Customers grouped by zip from the active set — used by byZipCodeSelect.
 */
const selectActiveCustomersByZip = createSelector(
  [selectFilteredCustomers],
  (customers): Map<string, Customer[]> =>
    new Grouper(customers).groupBy((c) => c.address.zip ?? "").toMap(),
);

export const customerValueFilterSelect = {
  selectedZips: selectSelectedZips,
  activeCustomers: selectActiveCustomers,
  filteredCustomers: selectFilteredCustomers,
  allZipCodes: selectAllZipCodes,
  customerCountByZip: selectCustomerCountByZip,
  activeCustomersByZip: selectActiveCustomersByZip,
};
