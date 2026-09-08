import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

// NOTE: These selectors expose raw persisted state only.
// For UI consumption (live preview of unsaved edits), use `priceIncreaseConfigSelect.settings`
// which returns the active draft when one exists, falling back to the active stored settings.

const selectStoredSettings = (state: AppState) => state.priceIncreaseSettings.storedSettings;

const selectActiveSettings = createSelector([selectStoredSettings], (storedSettings) =>
  storedSettings.find((d) => d.isActive) ?? null,
);

export const priceIncreaseSettingsSelect = {
  storedSettings: selectStoredSettings,
  activeSettings: selectActiveSettings,
};
