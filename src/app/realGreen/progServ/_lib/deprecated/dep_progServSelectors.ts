// import { AppState } from "@/store";
// import { hydrateProgCodes } from "@/app/realGreen/progServ/_lib/deprecated/_hydrateProgCodes";
// import { createSelector } from "@reduxjs/toolkit";
// import { Grouper } from "@/lib/Grouper";
//
// const selectProgCodeDocs = (state: AppState) => state.progServ.progCodeDocs;
// const selectDryServCodes = (state: AppState) => state.progServ.servCodeDocs;
// const selectProgServs = (state: AppState) => state.progServ.progServs;
//
// const selectProgCodes = createSelector(
//   [selectProgCodeDocs, selectDryServCodes, selectProgServs],
//   (dryProgCodes, dryServCodes, progServLinks) =>
//     hydrateProgCodes(dryProgCodes, dryServCodes, progServLinks),
// );
//
// const selectProgCodeByDefIdMap = createSelector([selectProgCodes], (progCodes) =>
//   new Grouper(progCodes).toUniqueMap((p) => p.progDefId),
// );
//
// const selectServCodes = createSelector([selectProgCodes], (progCodes) =>
//   progCodes.flatMap((progCode) => progCode.servCodes),
// );
//
// const selectServCodeMap = createSelector([selectServCodes], (servCodes) =>
//   new Grouper(servCodes).toUniqueMap((s) => s.servCodeId),
// );
//
// export const progServSelect = {
//   progCodes: selectProgCodes,
//   progCodeByDefIdMap: selectProgCodeByDefIdMap,
//   servCodes: selectServCodes,
//   servCodeMap: selectServCodeMap,
// };
