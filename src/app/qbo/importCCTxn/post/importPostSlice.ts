import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ImportPostContract } from "@/app/qbo/importCCTxn/post/api/ImportPostContract";
import { PostPreview, PostResult } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

const API_PATH = "/qbo/importCCTxn/post/api";

const previewPost = createStandardThunk<ImportPostContract, "previewPost">({
  typePrefix: "importPost/previewPost",
  apiPath: API_PATH,
  opName: "previewPost",
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
  /** The last posting or reconciling results, shown to the user until dismissed. */
  lastResults: PostResult[];
};

const initialState: ImportPostState = {
  preview: null,
  lastResults: [],
};

const importPostSlice = createSlice({
  name: "importPost",
  initialState,
  reducers: {
    closePreview(state) {
      state.preview = null;
    },
    clearResults(state) {
      state.lastResults = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(previewPost.pending, (state) => {
      state.preview = null;
    });
    builder.addCase(previewPost.fulfilled, (state, action) => {
      state.preview = action.payload;
    });
    builder.addCase(postRows.fulfilled, (state, action) => {
      state.preview = null;
      state.lastResults = action.payload;
    });
    builder.addCase(reconcileRow.fulfilled, (state, action) => {
      state.lastResults = [action.payload];
    });
  },
});

export const importPostActions = {
  ...importPostSlice.actions,
  previewPost,
  postRows,
  reconcileRow,
};
export const importPostReducer = importPostSlice.reducer;
