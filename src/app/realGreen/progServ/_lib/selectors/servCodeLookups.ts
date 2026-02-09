import { createSelector } from "@reduxjs/toolkit";
import { progServBaseSelect } from "@/app/realGreen/progServ/_lib/selectors/progServBaseSelectors";
import { AppState } from "@/store";

const selectUnsavedChanges = (state: AppState) => state.progServ.unsavedServCodeChanges;

const selectServCodeDocById = (servCodeId: string) =>
  createSelector([progServBaseSelect.servCodeDocMap], (servCodeMap) =>
    servCodeMap.get(servCodeId),
  );

const selectBasicServCodeById = (servCodeId: string) =>
  createSelector([progServBaseSelect.basicServCodeMap], (servCodeMap) => {
    return servCodeMap.get(servCodeId);
  })


export const servCodeLookup = {
  unsavedChanges: selectUnsavedChanges,
  docById: selectServCodeDocById,
  basicById: selectBasicServCodeById,
};
