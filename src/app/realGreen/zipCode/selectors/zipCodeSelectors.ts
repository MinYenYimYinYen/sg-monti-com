import { Grouper } from "@/lib/Grouper";
import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectZipCodeDocs = (state: AppState) => state.zipCode.zipCodeDocs;
// const selectZipCodeMap = createSelector([selectZipCodes], (zipCodes) =>
//   new Grouper(zipCodes).toUniqueMap((c) => c.zip),
// );
//
// export const zipCodeSelect = {
//   zipCodes: selectZipCodes,
//   zipCodeMap: selectZipCodeMap,
// };
