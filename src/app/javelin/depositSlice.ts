import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DepositAccountEntry, DepositAccountMap, DepositField, DepositRow, DepositState } from "@/app/javelin/JavelinTypes";

function buildDepositPrefix(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd} WWDep-`;
}

export const emptyDepositAccountMap: DepositAccountMap = {
  salesAmount: { qbName: "" },
  refundAmount: { qbName: "" },
  chargeBackAmount: { qbName: "" },
  adjustmentAmount: { qbName: "" },
  fees: { qbName: "" },
  netDeposit: { qbName: "" },
};

const initialState: DepositState = {
  rows: [],
  fileName: "",
  warnings: [],
  errors: [],
  journalNoPrefix: buildDepositPrefix(),
  savedAccountMap: emptyDepositAccountMap,
  liveAccountMap: emptyDepositAccountMap,
};

const depositSlice = createSlice({
  name: "deposit",
  initialState,
  reducers: {
    setRows(state, action: PayloadAction<DepositRow[]>) {
      state.rows = action.payload;
    },
    setFileName(state, action: PayloadAction<string>) {
      state.fileName = action.payload;
    },
    setWarnings(state, action: PayloadAction<string[]>) {
      state.warnings = action.payload;
    },
    setErrors(state, action: PayloadAction<string[]>) {
      state.errors = action.payload;
    },
    setJournalNoPrefix(state, action: PayloadAction<string>) {
      state.journalNoPrefix = action.payload;
    },
    setLiveAccountEntry(
      state,
      action: PayloadAction<{ field: DepositField; entry: DepositAccountEntry }>,
    ) {
      state.liveAccountMap[action.payload.field] = { ...action.payload.entry };
    },
    initAccountMap(state, action: PayloadAction<DepositAccountMap>) {
      state.savedAccountMap = action.payload;
      state.liveAccountMap = action.payload;
    },
    syncSavedAccountMap(state, action: PayloadAction<DepositAccountMap>) {
      state.savedAccountMap = action.payload;
    },
  },
});

export const depositActions = depositSlice.actions;

const depositReducer = depositSlice.reducer;
export default depositReducer;
