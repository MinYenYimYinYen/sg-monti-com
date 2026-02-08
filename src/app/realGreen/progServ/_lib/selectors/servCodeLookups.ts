import { createSelector } from "@reduxjs/toolkit";
import { progServBaseSelect } from "@/app/realGreen/progServ/_lib/selectors/progServBaseSelectors";
import { AppState } from "@/store";

const selectUnsavedChanges = (state: AppState) => state.progServ.unsavedServCodeChanges;

const selectServCodeById = (servCodeId: string) =>
  createSelector([progServBaseSelect.servCodeMap], (servCodeMap) =>
    servCodeMap.get(servCodeId),
  );


export const servCodeLookup = {
  unsavedChanges: selectUnsavedChanges,
  byId: selectServCodeById,
};
