import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { PrepayConfigContract } from "./prepayConfigContract";
import type { PrepayConfigDoc } from "./prepayConfigTypes";

type PrepayConfigState = {
  configs: PrepayConfigDoc[];
  /** The config currently open in the editor. null = new/blank. */
  draft: PrepayConfigDoc | null;
};

const initialState: PrepayConfigState = {
  configs: [],
  draft: null,
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

const getConfigs = createStandardThunk<PrepayConfigContract, "getConfigs">({
  typePrefix: "prepayConfig/getConfigs",
  apiPath: "/prepayLetters/config/api",
  opName: "getConfigs",
});

const saveConfig = createStandardThunk<PrepayConfigContract, "saveConfig">({
  typePrefix: "prepayConfig/saveConfig",
  apiPath: "/prepayLetters/config/api",
  opName: "saveConfig",
});

const deleteConfig = createStandardThunk<PrepayConfigContract, "deleteConfig">({
  typePrefix: "prepayConfig/deleteConfig",
  apiPath: "/prepayLetters/config/api",
  opName: "deleteConfig",
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const prepayConfigSlice = createSlice({
  name: "prepayConfig",
  initialState,
  reducers: {
    /** Load a saved config into the editor. */
    setDraft: (state, action: PayloadAction<PrepayConfigDoc>) => {
      state.draft = action.payload;
    },
    /** Patch individual fields on the active draft. */
    updateDraft: (state, action: PayloadAction<Partial<PrepayConfigDoc>>) => {
      if (state.draft) {
        state.draft = { ...state.draft, ...action.payload };
      }
    },
    /** Reset the editor to a blank new config. */
    clearDraft: (state) => {
      state.draft = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getConfigs.fulfilled, (state, action) => {
      state.configs = action.payload;
    });

    builder.addCase(saveConfig.fulfilled, (state, action) => {
      const saved = action.payload;
      const idx = state.configs.findIndex((c) => c.configId === saved.configId);
      if (idx !== -1) {
        state.configs[idx] = saved;
      } else {
        state.configs.push(saved);
      }
    });

    builder.addCase(deleteConfig.fulfilled, (state, action) => {
      const { configId } = action.meta.arg.params;
      state.configs = state.configs.filter((c) => c.configId !== configId);
    });
  },
});

export const prepayConfigReducer = prepayConfigSlice.reducer;
export const prepayConfigActions = {
  ...prepayConfigSlice.actions,
  getConfigs,
  saveConfig,
  deleteConfig,
};
