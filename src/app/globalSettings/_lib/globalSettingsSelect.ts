import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";
import { emptyDepositAccountMap } from "@/app/javelin/depositSlice";

const selectSettings = (state: AppState) => state.globalSettings.settings ?? baseGlobalSettings;

const selectSeason = createSelector(
  [selectSettings],
  (settings) => settings?.season,
);

const selectCoverSheetsConfig = createSelector(
  [selectSettings],
  (settings) => settings?.coverSheetsConfig,
);

const selectGenLedgerAccountMap = createSelector(
  [selectSettings],
  (settings) => settings?.genLedgerAccountMap ?? {},
);

const selectDepositAccountMap = createSelector(
  [selectSettings],
  (settings) => settings?.depositAccountMap ?? emptyDepositAccountMap,
);

const selectRenewalFlagIds = createSelector(
  [selectSettings],
  (settings) => settings.renewalFlagIds,
);

export const globalSettingsSelect = {
  settings: selectSettings,
  season: selectSeason,
  coverSheetsConfig: selectCoverSheetsConfig,
  genLedgerAccountMap: selectGenLedgerAccountMap,
  depositAccountMap: selectDepositAccountMap,
  renewalFlagIds: selectRenewalFlagIds,
};


