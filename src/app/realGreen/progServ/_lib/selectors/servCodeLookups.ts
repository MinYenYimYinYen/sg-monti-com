import { createSelector } from "@reduxjs/toolkit";
import { progServBaseSelect } from "@/app/realGreen/progServ/_lib/selectors/progServBaseSelectors";

const selectServCodeById = (servCodeId: string) =>
  createSelector([progServBaseSelect.servCodeMap], (servCodeMap) =>
    servCodeMap.get(servCodeId),
  );

export const servCodeLookup = {
  byId: selectServCodeById,
};
