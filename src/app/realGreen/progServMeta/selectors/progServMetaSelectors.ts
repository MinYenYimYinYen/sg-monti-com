import { AppState } from "@/store";
import { hydrateProgCodes } from "@/app/realGreen/progServMeta/_lib/hydrateProgCodes";
import { createSelector } from "@reduxjs/toolkit";

const selectDryProgCodes = (state: AppState) => state.progServMeta.dryProgCodes;
const selectDryServCodes = (state: AppState) => state.progServMeta.dryServCodes;
const selectProgServLinks = (state: AppState) =>
  state.progServMeta.progServLinks;

const selectProgCodes = createSelector(
  [selectDryProgCodes, selectDryServCodes, selectProgServLinks],
  (dryProgCodes, dryServCodes, progServLinks) =>
    hydrateProgCodes(dryProgCodes, dryServCodes, progServLinks),
);

const selectServCodes = createSelector([selectProgCodes], (progCodes) =>
  progCodes.flatMap((progCode) => progCode.servCodes),
);

export const progServMetaSelect = {
  //Source data
  dryProgCodes: selectDryProgCodes,
  dryServCodes: selectDryServCodes,
  progServLinks: selectProgServLinks,

  //Derived data
  progCodes: selectProgCodes,
  servCodes: selectServCodes,
};
