import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { JavelinContract } from "@/app/javelin/api/JavelinContract";
import { GenLedgerFile, JavelinState } from "@/app/javelin/JavelinTypes";

// Thin slice: the parsed files the user dropped, plus what the server answered. The server is the
// source of truth for the plan, the last run and the latest entries. None of these thunks has a
// staleTime or force, so a second dispatch while one runs is ignored, which is right for a write.
const API_PATH = "/javelin/api";

const previewGenLedger = createStandardThunk<JavelinContract, "previewGenLedger">({
  typePrefix: "javelin/previewGenLedger",
  apiPath: API_PATH,
  opName: "previewGenLedger",
});

const postGenLedger = createStandardThunk<JavelinContract, "postGenLedger">({
  typePrefix: "javelin/postGenLedger",
  apiPath: API_PATH,
  opName: "postGenLedger",
});

const previewDeposits = createStandardThunk<JavelinContract, "previewDeposits">({
  typePrefix: "javelin/previewDeposits",
  apiPath: API_PATH,
  opName: "previewDeposits",
});

const postDeposits = createStandardThunk<JavelinContract, "postDeposits">({
  typePrefix: "javelin/postDeposits",
  apiPath: API_PATH,
  opName: "postDeposits",
});

const previewCkDeposits = createStandardThunk<JavelinContract, "previewCkDeposits">({
  typePrefix: "javelin/previewCkDeposits",
  apiPath: API_PATH,
  opName: "previewCkDeposits",
});

const postCkDeposits = createStandardThunk<JavelinContract, "postCkDeposits">({
  typePrefix: "javelin/postCkDeposits",
  apiPath: API_PATH,
  opName: "postCkDeposits",
});

const getJavelinLatest = createStandardThunk<JavelinContract, "getLatest">({
  typePrefix: "javelin/getLatest",
  apiPath: API_PATH,
  opName: "getLatest",
});

const initialState: JavelinState = {
  files: [],
  confirmedDocNumbers: [],
  plan: [],
  lastRun: null,
  latest: null,
};

const javelinSlice = createSlice({
  name: "javelin",
  initialState,
  reducers: {
    setFiles(state, action: PayloadAction<GenLedgerFile[]>) {
      state.files = action.payload;
      // A plan and its confirmations describe the files they were made from.
      state.plan = [];
      state.confirmedDocNumbers = [];
    },
    toggleConfirmed(state, action: PayloadAction<string>) {
      const docNumber = action.payload;
      state.confirmedDocNumbers = state.confirmedDocNumbers.includes(docNumber)
        ? state.confirmedDocNumbers.filter((confirmed) => confirmed !== docNumber)
        : [...state.confirmedDocNumbers, docNumber];
    },
    clearLastRun(state) {
      state.lastRun = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(previewGenLedger.fulfilled, (state, action) => {
      state.plan = action.payload;
    });
    builder.addCase(postGenLedger.fulfilled, (state, action) => {
      state.lastRun = action.payload;
    });
    builder.addCase(getJavelinLatest.fulfilled, (state, action) => {
      state.latest = action.payload;
    });
  },
});

export const javelinActions = {
  ...javelinSlice.actions,
  previewGenLedger,
  postGenLedger,
  previewDeposits,
  postDeposits,
  previewCkDeposits,
  postCkDeposits,
  getJavelinLatest,
};

const javelinReducer = javelinSlice.reducer;
export default javelinReducer;
