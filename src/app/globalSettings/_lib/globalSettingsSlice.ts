import { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { GlobalSettingsContract } from "@/app/globalSettings/api/GlobalSettingsContract";

type GlobalSettingsState = {
  settings: GlobalSettings | null;
};

const initialState: GlobalSettingsState = {
  settings: null,
};

const globalSettingsSlice = createSlice({
  name: "globalSettings",
  initialState,
  reducers: {
    setSettings: (state, action) => {
      state.settings = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getSettings.fulfilled, (state, action) => {
      state.settings = action.payload;
    });
  },
});

const getSettings = createStandardThunk<GlobalSettingsContract, "getSettings">({
  opName: "getSettings",
  apiPath: "/globalSettings/api",
  typePrefix: "getSettings",
});

const updateSettings = createStandardThunk<
  GlobalSettingsContract,
  "updateSettings"
>({
  opName: "updateSettings",
  apiPath: "/globalSettings/api",
  typePrefix: "updateSettings",
});

export const globalSettingsActions = {
  ...globalSettingsSlice.actions,
  getSettings,
  updateSettings,
};

const globalSettingsReducer = globalSettingsSlice.reducer;
export default globalSettingsReducer;
