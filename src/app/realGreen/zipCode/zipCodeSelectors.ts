import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { ZipCode } from "./_lib/ZipCodeTypes";
import { taxCodeSelect } from "@/app/realGreen/taxCode/taxCodeSelectors";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

const selectZipCodeDocs = (state: AppState) => state.zipCode.zipCodeDocs;

const selectZipCodes = createSelector(
  [selectZipCodeDocs, taxCodeSelect.taxCodeMap],
  (zipCodeDocs, taxCodeMap) => {
    return zipCodeDocs.map((doc) => {
      const taxCodesMaybe = doc.taxIds.map((id) => taxCodeMap.get(id));
      const taxCodes = typeGuard.definedArray(taxCodesMaybe);
      const taxRate = taxCodes.reduce((acc, taxCode) => acc + taxCode.taxRate, 0);

      const zipCode: ZipCode = {
        ...doc,
        taxCodes,
        taxRate,
      };
      return zipCode;
    });
  },
);

const selectZipCodeMap = createSelector([selectZipCodes], (zipCodes) =>
  new Grouper(zipCodes).toUniqueMap((c) => c.zip),
);

export const zipCodeSelect = {
  zipCodes: selectZipCodes,
  zipCodeMap: selectZipCodeMap,
};
