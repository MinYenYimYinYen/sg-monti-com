import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";

const selectSettings = (state: AppState) => state.globalSettings.settings ?? baseGlobalSettings;

const selectSeason = createSelector(
  [selectSettings],
  (settings) => settings?.season,
);

const selectCoverSheetsConfig = createSelector(
  [selectSettings],
  (settings) => settings?.coverSheetsConfig,
);

export const globalSettingsSelect = {
  settings: selectSettings,
  season: selectSeason,
  coverSheetsConfig: selectCoverSheetsConfig,
};


