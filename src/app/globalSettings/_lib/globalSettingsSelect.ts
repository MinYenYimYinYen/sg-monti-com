import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectSettings = (state: AppState) => state.globalSettings.settings;

const selectSeason = createSelector(
  [selectSettings],
  (settings) => settings?.season,
);

export const globalSettingsSelect = {
  settings: selectSettings,
  season: selectSeason,
};


