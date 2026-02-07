import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

const selectTaxCodeDocs = (state: AppState) => state.taxCode.taxCodeDocs;

const selectTaxCodes = createSelector(
  [selectTaxCodeDocs, centralSelect.customers],
  (taxCodeDocs, customers) => {
    // 1. Group Customers by Tax Code ID directly
    const customersByTaxCode = new Map<string, Customer[]>();

    for (const customer of customers) {
      for (const taxId of customer.taxIds) {
        let list = customersByTaxCode.get(taxId);
        if (!list) {
          list = [];
          customersByTaxCode.set(taxId, list);
        }
        list.push(customer);
      }
    }

    // 2. Map Docs to Rich Objects
    return taxCodeDocs.map((doc) => ({
      ...doc,
      customers: customersByTaxCode.get(doc.taxCodeId) || [],
    }));
  },
);

const selectTaxCodeMap = createSelector([selectTaxCodes], (taxCodes) =>
  new Grouper(taxCodes).toUniqueMap((c) => c.taxCodeId),
);

export const taxCodeSelect = {
  taxCodes: selectTaxCodes,
  taxCodeMap: selectTaxCodeMap,
};
