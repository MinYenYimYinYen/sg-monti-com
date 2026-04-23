import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectTaxCodeDocs = (state: AppState) => state.taxCode.taxCodeDocs;

const selectTaxCodes = createSelector(
  [selectTaxCodeDocs],
  (taxCodeDocs) => {
    return taxCodeDocs.map((doc) => {
      const taxCode: TaxCode = {
        ...doc,
      };
      return taxCode;
    });
  },
);

const selectTaxCodeMap = createSelector(
  [selectTaxCodes],
  (basicTaxCodes) => {
    return new Grouper(basicTaxCodes).toUniqueMap((c) => c.taxCodeId);
  },
);

export const taxCodeSelect = {
  taxCodes: selectTaxCodes,
  taxCodeMap: selectTaxCodeMap,
};
