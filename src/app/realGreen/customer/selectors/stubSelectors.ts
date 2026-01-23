import { createSelector } from "@reduxjs/toolkit";
import {
  Customer,
  CustomerSliceState,
} from "../_lib/types/entities/Customer";
import { Program, ProgramSliceState } from "../_lib/types/entities/Program";

// --- STUB CUSTOMERS ---
const getCustomerDocs = (state: CustomerSliceState) => state.customerDocs;

export const selectStubCustomers = createSelector(
  [getCustomerDocs],
  (customerDocs): Customer[] => {
    return customerDocs.map((c) => ({
      ...c,
      programs: [], // Stub: No children
    }));
  },
);

// --- STUB PROGRAMS ---
const getProgramDocs = (state: ProgramSliceState) => state.programDocs;

export const selectStubPrograms = createSelector(
  [getProgramDocs, selectStubCustomers],
  (programDocs, stubCustomers): Program[] => {
    const customersById = new Map(stubCustomers.map((c) => [c.custId, c]));

    return programDocs.map((p) => ({
      ...p,
      services: [], // Stub: No children
      customer: customersById.get(p.custId), // Attach Stub Parent
    }));
  },
);
