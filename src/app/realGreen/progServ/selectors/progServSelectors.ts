import { AppState } from "@/store";
import { hydrateProgCodes } from "@/app/realGreen/progServ/_lib/hydrateProgCodes";
import { createSelector } from "@reduxjs/toolkit";

const selectDryProgCodes = (state: AppState) => state.progServ.dryProgCodes;
const selectDryServCodes = (state: AppState) => state.progServ.dryServCodes;
const selectProgServLinks = (state: AppState) =>
  state.progServ.progServLinks;

const selectProgCodes = createSelector(
  [selectDryProgCodes, selectDryServCodes, selectProgServLinks],
  (dryProgCodes, dryServCodes, progServLinks) =>
    hydrateProgCodes(dryProgCodes, dryServCodes, progServLinks),
);

const selectServCodes = createSelector([selectProgCodes], (progCodes) =>
  progCodes.flatMap((progCode) => progCode.servCodes),
);

export const progServSelect = {
  //Source data
  dryProgCodes: selectDryProgCodes,
  dryServCodes: selectDryServCodes,
  progServLinks: selectProgServLinks,

  //Derived data
  progCodes: selectProgCodes,
  servCodes: selectServCodes,
};
