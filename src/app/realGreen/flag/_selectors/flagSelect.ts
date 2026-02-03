import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Flag } from "@/app/realGreen/flag/FlagTypes";
import { Grouper } from "@/lib/Grouper";

const selectFlagDocs = (state: AppState) => state.flag.flagDocs;

const selectFlags = createSelector([selectFlagDocs], (flagDocs) => {
  return flagDocs as Flag[];
});

const selectFlagMap = createSelector([selectFlags], (flags) =>
  new Grouper(flags).toUniqueMap((c) => c.flagId),
);

export const flagSelect = {
  flags: selectFlags,
  flagMap: selectFlagMap,
};
