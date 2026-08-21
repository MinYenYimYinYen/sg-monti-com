import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { TimeCardContract } from "@/app/timeCard/api/timeCardContract";
import { Punch } from "@/app/timeCard/TimeCardTypes";

export type ImportStage =
  | { stage: "idle" }
  | { stage: "errors"; fileName: string; errors: string[] }
  | { stage: "preview"; fileName: string; warnings: string[] }
  | { stage: "result"; imported: number; apiErrors: string[] };

export type SaveStatus = "idle" | "saving" | "success";

type TimeCardImportState = {
  csvRows: Punch[];
  /** punchIds the user has opted to exclude from the current import session. */
  skippedPunchIds: number[];
  importStage: ImportStage;
  saveStatus: SaveStatus;
  /** Persisted in Redux so the sheet stays open when the user navigates away to generate a CSV. */
  isImportSheetOpen: boolean;
};

const initialState: TimeCardImportState = {
  csvRows: [],
  skippedPunchIds: [],
  importStage: { stage: "idle" },
  saveStatus: "idle",
  isImportSheetOpen: false,
};

const importPunches = createStandardThunk<TimeCardContract, "importPunches">({
  typePrefix: "timeCardImport/importPunches",
  apiPath: "/timeCard/api",
  opName: "importPunches",
});

const getPunches = createStandardThunk<TimeCardContract, "getPunches">({
  typePrefix: "timeCardImport/getPunches",
  apiPath: "/timeCard/api",
  opName: "getPunches",
});

const timeCardImportSlice = createSlice({
  name: "timeCardImport",
  initialState,
  reducers: {
    setCsvRows(state, action: PayloadAction<Punch[]>) {
      state.csvRows = action.payload;
    },
    setSkippedPunchIds(state, action: PayloadAction<number[]>) {
      state.skippedPunchIds = action.payload;
    },
    setImportStage(state, action: PayloadAction<ImportStage>) {
      state.importStage = action.payload;
    },
    setSaveStatus(state, action: PayloadAction<SaveStatus>) {
      state.saveStatus = action.payload;
    },
    openImportSheet(state) {
      state.isImportSheetOpen = true;
    },
    closeImportSheet(state) {
      state.isImportSheetOpen = false;
    },
    resetImport(state) {
      state.csvRows = [];
      state.skippedPunchIds = [];
      state.importStage = { stage: "idle" };
      state.saveStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(importPunches.fulfilled, (state, action) => {
      const { imported, errors } = action.payload;
      state.saveStatus = "success";
      state.importStage = {
        stage: "result",
        imported,
        apiErrors: errors ? errors.map((e) => String(e)) : [],
      };
    });

    builder.addCase(getPunches.fulfilled, (state, action) => {
      state.csvRows = action.payload;
    });
  },
});

export const timeCardImportActions = {
  ...timeCardImportSlice.actions,
  importPunches,
  getPunches,
};

export const timeCardImportReducer = timeCardImportSlice.reducer;
