import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { makeCustomersSelector } from "@/app/realGreen/customer/selectors/centralSelectors";
import { toast } from "react-toastify";

// ---------------------------------------------------------------------------
// Source selectors — read directly from state.customer.single (not central Map)
//
// Each selector deduplicates its docs by natural key before passing them to
// makeCustomersSelector. This is a safety net for the race condition where
// lookup() is called multiple times before the first response arrives — all
// fulfilled actions append to the same arrays, producing duplicate docs.
// ---------------------------------------------------------------------------

const selectSingleCustomerDocs = createSelector(
  [(state: AppState) => state.customer.single.customerDocs],
  (docs) => {
    const seen = new Set<number>();
    return docs.filter((d) => {
      if (seen.has(d.custId)) return false;
      seen.add(d.custId);
      return true;
    });
  },
);

const selectSingleProgramDocs = createSelector(
  [(state: AppState) => state.customer.single.programDocs],
  (docs) => {
    const seen = new Set<number>();
    return docs.filter((d) => {
      if (seen.has(d.progId)) return false;
      seen.add(d.progId);
      return true;
    });
  },
);

const selectSingleServiceDocs = createSelector(
  [(state: AppState) => state.customer.single.serviceDocs],
  (docs) => {
    const seen = new Set<number>();
    return docs.filter((d) => {
      if (seen.has(d.servId)) return false;
      seen.add(d.servId);
      return true;
    });
  },
);

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
  (customers) => {
    // Guard: multiple distinct customers in the single slice is a bug.
    // Surface it as an error toast and return only the first customer.
    if (customers.length > 1) {
      const ids = customers.map((c) => c.custId).join(", ");
      toast.error(`[singleCustSelect] Multiple customers in single slice (${ids}). Showing first only.`);
    }
    return customers[0] ?? null;
  },
);

// Raw docs from the single slice — used to transfer data to other contexts after save.
const selectRawDocs = (state: AppState) => ({
  customerDocs: state.customer.single.customerDocs,
  programDocs: state.customer.single.programDocs,
  serviceDocs: state.customer.single.serviceDocs,
});

export const singleCustSelect = {
  customer: selectCustomer,
  rawDocs: selectRawDocs,
};
