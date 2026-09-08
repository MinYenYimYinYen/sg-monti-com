import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { priceIncreaseSettingsSelect } from "@/app/priceIncrease/settings/settingsSelect";

const selectDocs = (state: AppState) => state.seasonIncreases.docs;

/**
 * The active season increases doc is determined by the active PriceIncreaseSettings'
 * seasonIncreasesId — not by an isActive flag on the doc itself.
 */
const selectActiveDoc = createSelector(
  [selectDocs, priceIncreaseSettingsSelect.activeSettings],
  (docs, activeSettings) => {
    if (!activeSettings) return null;
    return docs.find((doc) => doc.seasonIncreasesId === activeSettings.seasonIncreasesId) ?? null;
  },
);

export const seasonIncreasesSelect = {
  docs: selectDocs,
  activeDoc: selectActiveDoc,
};
