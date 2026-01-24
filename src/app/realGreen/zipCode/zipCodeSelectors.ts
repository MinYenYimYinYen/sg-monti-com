import { Grouper } from "@/lib/Grouper";
import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { ZipCode } from "./_lib/ZipCodeTypes";

const selectZipCodeDocs = (state: AppState) => state.zipCode.zipCodeDocs;

const selectZipCodes = createSelector( //Mocking Hydration
  [selectZipCodeDocs],
  (zipCodeDocs) => zipCodeDocs as ZipCode[],
);

const selectZipCodeMap = createSelector([selectZipCodes], (zipCodes) =>
  new Grouper(zipCodes).toUniqueMap((c) => c.zip),
);

export const zipCodeSelect = {
  zipCodes: selectZipCodes,
  zipCodeMap: selectZipCodeMap,
};
