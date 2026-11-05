import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ImportRowContract } from "@/app/qbo/importCCTxn/rows/api/ImportRowContract";
import { importCCTxnMappingActions } from "@/app/qbo/importCCTxn/importCCTxnMappingSlice";
import { importDecisionActions } from "@/app/qbo/importCCTxn/decisions/importDecisionSlice";
import { applySkipRuleToRows } from "@/app/qbo/importCCTxn/_lib/importSkipUtils";
import { ImportCsvRow } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import {
  ImportCommitResult,
  ImportPreview,
  ImportRow,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";

const API_PATH = "/qbo/importCCTxn/rows/api";

const previewImport = createStandardThunk<ImportRowContract, "previewImport">({
  typePrefix: "importRow/previewImport",
  apiPath: API_PATH,
  opName: "previewImport",
});
const commitImport = createStandardThunk<ImportRowContract, "commitImport">({
  typePrefix: "importRow/commitImport",
  apiPath: API_PATH,
  opName: "commitImport",
});
const getOpenRows = createStandardThunk<ImportRowContract, "getOpenRows">({
  typePrefix: "importRow/getOpenRows",
  apiPath: API_PATH,
  opName: "getOpenRows",
});
const setRowSkip = createStandardThunk<ImportRowContract, "setRowSkip">({
  typePrefix: "importRow/setRowSkip",
  apiPath: API_PATH,
  opName: "setRowSkip",
});

const setRowAccount = createStandardThunk<ImportRowContract, "setRowAccount">({
  typePrefix: "importRow/setRowAccount",
  apiPath: API_PATH,
  opName: "setRowAccount",
});

/**
 * Parse errors and the parsed file live here (not in the component) so the page and its
 * panels read them with useSelector. The file is parsed in the browser; the server re-derives
 * everything it relies on.
 */
export type ImportFileState =
  | { stage: "idle" }
  | { stage: "errors"; fileName: string; errors: string[] }
  | { stage: "parsed"; fileName: string; formatLabel: string; rows: ImportCsvRow[] };

export type ImportCommitStatus = "idle" | "success";

type ImportRowState = {
  openRows: ImportRow[];
  file: ImportFileState;
  preview: ImportPreview | null;
  /** Possible duplicates the user chose to keep out, by file row number. */
  confirmedDuplicateRowNumbers: number[];
  commitStatus: ImportCommitStatus;
  lastCommit: ImportCommitResult | null;
};

const initialState: ImportRowState = {
  openRows: [],
  file: { stage: "idle" },
  preview: null,
  confirmedDuplicateRowNumbers: [],
  commitStatus: "idle",
  lastCommit: null,
};

const importRowSlice = createSlice({
  name: "importRow",
  initialState,
  reducers: {
    setFile(state, action: PayloadAction<ImportFileState>) {
      state.file = action.payload;
      state.preview = null;
      state.confirmedDuplicateRowNumbers = [];
      state.commitStatus = "idle";
      state.lastCommit = null;
    },
    setConfirmedDuplicateRowNumbers(state, action: PayloadAction<number[]>) {
      state.confirmedDuplicateRowNumbers = action.payload;
    },
    resetImport(state) {
      state.file = { stage: "idle" };
      state.preview = null;
      state.confirmedDuplicateRowNumbers = [];
      state.commitStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(previewImport.fulfilled, (state, action) => {
      state.preview = action.payload;
    });
    builder.addCase(commitImport.fulfilled, (state, action) => {
      state.lastCommit = action.payload;
      state.commitStatus = "success";
      state.preview = null;
      state.file = { stage: "idle" };
      state.confirmedDuplicateRowNumbers = [];
      // The newly stored rows join the open list without a reload.
      const storedIds = new Set(action.payload.insertedRows.map((row) => row.rowId));
      state.openRows = [
        ...state.openRows.filter((row) => !storedIds.has(row.rowId)),
        ...action.payload.insertedRows,
      ];
    });
    builder.addCase(getOpenRows.fulfilled, (state, action) => {
      state.openRows = action.payload;
    });
    builder.addCase(setRowSkip.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.openRows.findIndex((row) => row.rowId === saved.rowId);
      if (index !== -1) state.openRows[index] = saved;
    });
    builder.addCase(setRowAccount.fulfilled, (state, action) => {
      const saved = action.payload;
      const index = state.openRows.findIndex((row) => row.rowId === saved.rowId);
      if (index !== -1) state.openRows[index] = saved;
    });
    // A new "always skip this merchant" rule skips that merchant's pending rows on the server.
    // Applying the same rule here keeps the open rows in step without a reload.
    builder.addCase(importCCTxnMappingActions.upsertSkipRule.fulfilled, (state, action) => {
      state.openRows = applySkipRuleToRows({ rows: state.openRows, skipRule: action.payload });
    });
    // The Map tab's batch save returns the rows it changed, and the skip rules it stored. Rows
    // go in first, then the rules, the same order the server used.
    builder.addCase(importDecisionActions.saveDecisions.fulfilled, (state, action) => {
      const changedRows = new Map(action.payload.rows.map((row) => [row.rowId, row]));
      state.openRows = state.openRows.map((row) => changedRows.get(row.rowId) ?? row);
      for (const skipRule of action.payload.skipRules) {
        state.openRows = applySkipRuleToRows({ rows: state.openRows, skipRule });
      }
    });
  },
});

export const importRowActions = {
  ...importRowSlice.actions,
  previewImport,
  commitImport,
  getOpenRows,
  setRowSkip,
  setRowAccount,
};
export const importRowReducer = importRowSlice.reducer;
