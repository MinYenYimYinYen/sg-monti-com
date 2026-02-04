import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import {Grouper} from "@/lib/Grouper";

const selectTaxCodeDocs = (state: AppState) => state.taxCode.taxCodeDocs;

const selectTaxCodes = createSelector(
  // Mocking Hydration
  [selectTaxCodeDocs],
  (taxCodeDocs) => taxCodeDocs as TaxCode[],
);

const selectTaxCodeMap = createSelector([selectTaxCodes], (taxCodes) =>
  new Grouper(taxCodes).toUniqueMap((c) => c.taxCodeId),
);

export const taxCodeSelect = {
  taxCodes: selectTaxCodes,
  taxCodeMap: selectTaxCodeMap,
}
