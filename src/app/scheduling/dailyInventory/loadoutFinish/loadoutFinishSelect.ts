import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { createValidationSelectors } from "@/lib/validation/createValidationSelectors";
import { LoadoutValidator } from "@/app/scheduling/dailyInventory/_lib/LoadoutValidator";
import { loadoutSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutSelect";

const selectFinishLoadoutTouchedFields = (state: AppState) =>
  state.loadoutFinish.finishLoadoutTouchedFields;

const selectShowAllFinishLoadoutIssues = (state: AppState) =>
  state.loadoutFinish.showAllFinishLoadoutIssues;

const selectFinishLoadoutData = loadoutSelect.hydratedFinishLoadout;

const selectFinishValidation = createValidationSelectors({
  selectData: selectFinishLoadoutData,
  selectTouchedFields: selectFinishLoadoutTouchedFields,
  selectShowAll: selectShowAllFinishLoadoutIssues,
  validator: class extends LoadoutValidator {
    constructor() {
      super("finish");
    }
  },
});

export const loadoutFinishSelect = {
  finishLoadoutTouchedFields: selectFinishLoadoutTouchedFields,
  showAllFinishLoadoutIssues: selectShowAllFinishLoadoutIssues,
  finishLoadout: {
    data: selectFinishLoadoutData,
    finishValidation: selectFinishValidation,
  },
};
