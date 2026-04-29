import { createSelector } from "@reduxjs/toolkit";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { AppState } from "@/store";

const selectUnsavedChanges = (state: AppState) => state.progServ.unsavedServCodeChanges;

const selectServCodeDocById = (servCodeId: string) =>
  createSelector([progServSelect.servCodeDocMap], (servCodeMap) =>
    servCodeMap.get(servCodeId),
  );

const selectServCodeById = (servCodeId: string) =>
  createSelector([progServSelect.servCodeMap], (servCodeMap) => {
    return servCodeMap.get(servCodeId);
  });


export const servCodeLookup = {
  unsavedChanges: selectUnsavedChanges,
  docById: selectServCodeDocById,
  byId: selectServCodeById,
};
