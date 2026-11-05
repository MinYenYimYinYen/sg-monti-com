import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ImportPostContract } from "@/app/qbo/importCCTxn/post/api/ImportPostContract";
import {
  BatchPreview,
  PostPreview,
  PostRowsResult,
} from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { settledRun } from "@/app/qbo/importCCTxn/_lib/importBatchRunUtils";

const API_PATH = "/qbo/importCCTxn/post/api";

const previewPost = createStandardThunk<ImportPostContract, "previewPost">({
  typePrefix: "importPost/previewPost",
  apiPath: API_PATH,
  opName: "previewPost",
});
const previewBatch = createStandardThunk<ImportPostContract, "previewBatch">({
  typePrefix: "importPost/previewBatch",
  apiPath: API_PATH,
  opName: "previewBatch",
});
const postRows = createStandardThunk<ImportPostContract, "postRows">({
  typePrefix: "importPost/postRows",
  apiPath: API_PATH,
  opName: "postRows",
});
const reconcileRow = createStandardThunk<ImportPostContract, "reconcileRow">({
  typePrefix: "importPost/reconcileRow",
  apiPath: API_PATH,
  opName: "reconcileRow",
});

type ImportPostState = {
  /** The row whose confirmation dialog is open, and what the server says posting it would do. */
  preview: PostPreview | null;
  /** The date range being reviewed for a batch post, and what the server says it would send. */
  batchPreview: BatchPreview | null;
  /** The last posting or reconciling run, shown to the user until dismissed. */
  lastRun: PostRowsResult | null;
};

const initialState: ImportPostState = {
  preview: null,
  batchPreview: null,
  lastRun: null,
};

const importPostSlice = createSlice({
  name: "importPost",
  initialState,
  reducers: {
    closePreview(state) {
      state.preview = null;
    },
    closeBatchPreview(state) {
      state.batchPreview = null;
    },
    clearResults(state) {
      state.lastRun = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(previewPost.pending, (state) => {
      state.preview = null;
    });
    builder.addCase(previewPost.fulfilled, (state, action) => {
      state.preview = action.payload;
    });
    builder.addCase(previewBatch.pending, (state) => {
      state.batchPreview = null;
    });
    builder.addCase(previewBatch.fulfilled, (state, action) => {
      state.batchPreview = action.payload;
    });
    builder.addCase(postRows.fulfilled, (state, action) => {
      state.preview = null;
      state.batchPreview = null;
      state.lastRun = action.payload;
    });
    builder.addCase(reconcileRow.fulfilled, (state, action) => {
      state.lastRun = settledRun([action.payload]);
    });
  },
});

export const importPostActions = {
  ...importPostSlice.actions,
  previewPost,
  previewBatch,
  postRows,
  reconcileRow,
};
export const importPostReducer = importPostSlice.reducer;
