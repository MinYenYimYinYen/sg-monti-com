import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";

// ---------------------------------------------------------------------------
// sanitySelect — the global data pipeline for the sanity section.
//
// Calls centralSelect and applies shared UI filters (excludedProgCodeIds) once.
// All downstream sanity selectors (customerSanitySelect, programSanitySelect,
// zeroRevenueSelect, etc.) consume these pre-filtered outputs and never need
// to know about excludedProgCodeIds.
//
// The filtered customers are fully rebuilt with a fresh CustomerUtils (x)
// instance so that customer.x.programs, customer.x.serviceQuery, and all
// derived Utils methods operate on the filtered program set — no foot gun.
// ---------------------------------------------------------------------------

const selectExcludedProgCodeIds = (state: AppState) =>
  state.sanity.allPages.excludedProgCodeIds;

/** Customers with excluded prog codes removed from their programs array. */
const selectCustomers = createSelector(
  [centralSelect.customers, selectExcludedProgCodeIds],
  (customers, excludedIds): Customer[] => {
    if (excludedIds.length === 0) return customers;
    return customers.map((customer) => {
      const filteredPrograms = customer.programs.filter(
        (p) => !excludedIds.includes(p.progCode.progCodeId),
      );
      // Rebuild with filtered programs and a fresh x so Utils stays in sync
      const rebuilt = { ...customer, programs: filteredPrograms };
      rebuilt.x = new CustomerUtils(rebuilt, customer.x.renewalFlagIds);
      return rebuilt as Customer;
    });
  },
);

/** Active (status "9") programs from the filtered customers. */
const selectPrograms = createSelector([selectCustomers], (customers) =>
  customers.flatMap((c) => c.programs).filter((p) => p.status === "9"),
);

/** All services from the filtered programs. */
const selectServices = createSelector([selectPrograms], (programs) =>
  programs.flatMap((p) => p.services),
);

export const sanitySelect = {
  excludedProgCodeIds: selectExcludedProgCodeIds,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
};
