import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectDocs = (state: AppState) => state.priceIncreaseSettings.docs;

const selectActiveDoc = createSelector([selectDocs], (docs) =>
  docs.find((d) => d.isActive) ?? null,
);

export const priceIncreaseSettingsSelect = {
  docs: selectDocs,
  activeDoc: selectActiveDoc,
};
