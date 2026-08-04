import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { makeCustomersSelector } from "@/app/realGreen/customer/selectors/centralSelectors";

// ---------------------------------------------------------------------------
// Source selectors — read directly from state.customer.single (not central Map)
// ---------------------------------------------------------------------------

const selectSingleCustomerDocs = (state: AppState) =>
  state.customer.single.customerDocs;

const selectSingleProgramDocs = (state: AppState) =>
  state.customer.single.programDocs;

const selectSingleServiceDocs = (state: AppState) =>
  state.customer.single.serviceDocs;

// ---------------------------------------------------------------------------
// Fully hydrated selector — same Customer shape as centralSelect.customers,
// but sourced from the single slice so it never interferes with the central Map.
// ---------------------------------------------------------------------------

const selectSingleCustomers = makeCustomersSelector(
  selectSingleCustomerDocs,
  selectSingleProgramDocs,
  selectSingleServiceDocs,
);

const selectCustomer = createSelector(
  [selectSingleCustomers],
  (customers) => customers[0] ?? null,
);

export const singleCustSelect = {
  customer: selectCustomer,
};
