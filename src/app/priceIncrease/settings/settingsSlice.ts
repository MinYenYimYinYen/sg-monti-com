import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { PriceIncreaseSettingsContract } from "@/app/priceIncrease/settings/api/PriceIncreaseSettingsContract";
import { PriceIncreaseSettingsDoc } from "@/app/priceIncrease/settings/PriceIncreaseSettingsTypes";

// NOTE: This slice holds only the persisted settings fetched from the server.
// For UI consumption (live preview of unsaved edits), use `priceIncreaseConfigSelect.settings`
// which returns the active draft when one exists, falling back to the active stored settings.

type PriceIncreaseSettingsState = {
  storedSettings: PriceIncreaseSettingsDoc[];
};

const initialState: PriceIncreaseSettingsState = {
  storedSettings: [],
};

export const getAllPriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "getAll">({
  typePrefix: "priceIncreaseSettings/getAll",
  apiPath: "/priceIncrease/settings/api",
  opName: "getAll",
});

export const upsertPriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "upsert">({
  typePrefix: "priceIncreaseSettings/upsert",
  apiPath: "/priceIncrease/settings/api",
  opName: "upsert",
});

export const setActivePriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "setActive">({
  typePrefix: "priceIncreaseSettings/setActive",
  apiPath: "/priceIncrease/settings/api",
  opName: "setActive",
});

export const removePriceIncreaseSettings = createStandardThunk<PriceIncreaseSettingsContract, "remove">({
  typePrefix: "priceIncreaseSettings/remove",
  apiPath: "/priceIncrease/settings/api",
  opName: "remove",
});

const settingsSlice = createSlice({
  name: "priceIncreaseSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAllPriceIncreaseSettings.fulfilled, (state, action) => {
      state.storedSettings = action.payload;
    });
    builder.addCase(upsertPriceIncreaseSettings.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.storedSettings.findIndex((d) => d.settingsId === updated.settingsId);
      if (idx >= 0) {
        state.storedSettings[idx] = updated;
      } else {
        state.storedSettings.push(updated);
      }
    });
    builder.addCase(setActivePriceIncreaseSettings.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { settingsId: string } }).params.settingsId;
      state.storedSettings = state.storedSettings.map((d) => ({ ...d, isActive: d.settingsId === id }));
    });
    builder.addCase(removePriceIncreaseSettings.fulfilled, (state, action) => {
      const id = (action.meta.arg as { params: { settingsId: string } }).params.settingsId;
      state.storedSettings = state.storedSettings.filter((d) => d.settingsId !== id);
    });
  },
});

export const priceIncreaseSettingsActions = {
  ...settingsSlice.actions,
  getAllPriceIncreaseSettings,
  upsertPriceIncreaseSettings,
  setActivePriceIncreaseSettings,
  removePriceIncreaseSettings,
};

export default settingsSlice.reducer;
