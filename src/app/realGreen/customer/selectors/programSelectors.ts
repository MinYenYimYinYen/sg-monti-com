import { createSelector } from "@reduxjs/toolkit";
import { Program, ProgramSliceState } from "../_lib/types/entities/Program";
import { selectStubCustomers } from "./stubSelectors";
import { selectRichServices } from "./serviceSelectors";
import { Grouper } from "@/lib/Grouper";
import { CustomerSliceState } from "../_lib/types/entities/Customer";

// Combine state requirements
type ProgramSelectorState = ProgramSliceState & CustomerSliceState;

const getProgramDocs = (state: ProgramSelectorState) => state.programDocs;

export const selectRichPrograms = createSelector(
  [getProgramDocs, selectRichServices, selectStubCustomers],
  (programDocs, richServices, stubCustomers): Program[] => {
    // 1. Map Services by ProgId (Children)
    const servicesByProgId = new Grouper(richServices)
      .groupBy((s) => s.progId)
      .toMap();

    // 2. Map Customers by CustId (Parent)
    const customersById = new Map(stubCustomers.map((c) => [c.custId, c]));

    // 3. Hydrate
    return programDocs.map((p) => ({
      ...p,
      services: servicesByProgId.get(p.progId) || [], // Attach Rich Children
      customer: customersById.get(p.custId), // Attach Stub Parent
    }));
  },
);
