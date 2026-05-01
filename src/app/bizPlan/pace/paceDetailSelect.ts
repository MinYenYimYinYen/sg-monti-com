import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";

const selectServCodeId = (state: AppState) => state.pace.selectedServCodeId;
const selectPace = createSelector(
  [selectServCodeId, paceSelect.servCodePaceMap],
  (servCodeId, paceMap) => {
    const pace = paceMap.get(servCodeId ?? "") ?? null;
    return pace;
  },
);


