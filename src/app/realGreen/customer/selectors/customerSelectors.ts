import { createSelector } from "@reduxjs/toolkit";
import {
  Customer,
  CustomerSliceState,
} from "../_lib/types/entities/Customer";
import { selectRichPrograms } from "./programSelectors";
import { Grouper } from "@/lib/Grouper";

const getCustomerDocs = (state: CustomerSliceState) => state.customerDocs;

export const selectRichCustomers = createSelector(
  [getCustomerDocs, selectRichPrograms],
  (customerDocs, richPrograms): Customer[] => {
    // 1. Map Programs by CustId (Children)
    const programsByCustId = new Grouper(richPrograms)
      .groupBy((p) => p.custId)
      .toMap();

    // 2. Hydrate
    return customerDocs.map((c) => ({
      ...c,
      programs: programsByCustId.get(c.custId) || [], // Attach Rich Children
    }));
  },
);
