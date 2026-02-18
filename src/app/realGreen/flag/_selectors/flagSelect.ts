import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";

const selectFlagDocs = (state: AppState) => state.flag.flagDocs;

const selectFlagDocMap = createSelector([selectFlagDocs], (flagDocs) =>
  new Grouper(flagDocs).toUniqueMap((c) => c.flagId),
);

export const flagSelect = {
  flagDocs: selectFlagDocs,
  flagDocMap: selectFlagDocMap,
};
