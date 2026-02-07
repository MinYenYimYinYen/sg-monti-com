import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { Grouper } from "@/lib/Grouper";

const selectTaxCodeDocs = (state: AppState) => state.taxCode.taxCodeDocs;

const selectBasicTaxCodes = createSelector(
  [selectTaxCodeDocs],
  (taxCodeDocs) => {
    return taxCodeDocs.map((doc) => {
      const taxCode: TaxCode = {
        ...doc,
        customers: [],
      };
      return taxCode;
    });
  },
);

const selectBasicTaxCodeMap = createSelector(
  [selectBasicTaxCodes],
  (basicTaxCodes) => {
    return new Grouper(basicTaxCodes).toUniqueMap((c) => c.taxCodeId);
  },
);

export const basicTaxCodeSelect = {
  basicTaxCodes: selectBasicTaxCodes,
  basicTaxCodeMap: selectBasicTaxCodeMap,
}
