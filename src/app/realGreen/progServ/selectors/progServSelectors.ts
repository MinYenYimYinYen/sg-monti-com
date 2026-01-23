import { AppState } from "@/store";
import { hydrateProgCodes } from "@/app/realGreen/progServ/_lib/hydrateProgCodes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";

const selectDryProgCodes = (state: AppState) => state.progServ.dryProgCodes;
const selectDryServCodes = (state: AppState) => state.progServ.dryServCodes;
const selectProgServLinks = (state: AppState) => state.progServ.progServLinks;

const selectProgCodes = createSelector(
  [selectDryProgCodes, selectDryServCodes, selectProgServLinks],
  (dryProgCodes, dryServCodes, progServLinks) =>
    hydrateProgCodes(dryProgCodes, dryServCodes, progServLinks),
);

const selectProgCodeByDefIdMap = createSelector([selectProgCodes], (progCodes) =>
  new Grouper(progCodes).toUniqueMap((p) => p.progDefId),
);

const selectServCodes = createSelector([selectProgCodes], (progCodes) =>
  progCodes.flatMap((progCode) => progCode.servCodes),
);

const selectServCodeMap = createSelector([selectServCodes], (servCodes) =>
  new Grouper(servCodes).toUniqueMap((s) => s.servCodeId),
);

export const progServSelect = {
  //Source data
  dryProgCodes: selectDryProgCodes,
  dryServCodes: selectDryServCodes,
  progServLinks: selectProgServLinks,

  //Derived data
  progCodes: selectProgCodes,
  progCodeByDefIdMap: selectProgCodeByDefIdMap,
  servCodes: selectServCodes,
  servCodeMap: selectServCodeMap,
};
