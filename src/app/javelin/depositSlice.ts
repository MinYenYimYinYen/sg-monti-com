import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DepositRow, DepositState } from "@/app/javelin/JavelinTypes";
import { javelinActions } from "@/app/javelin/javelinSlice";

const initialState: DepositState = {
  rows: [],
  fileName: "",
  warnings: [],
  errors: [],
  confirmedDocNumbers: [],
  plan: [],
  lastRun: null,
};

const depositSlice = createSlice({
  name: "deposit",
  initialState,
  reducers: {
    setRows(state, action: PayloadAction<DepositRow[]>) {
      state.rows = action.payload;
      // A plan and its confirmations describe the rows they were made from.
      state.plan = [];
      state.confirmedDocNumbers = [];
    },
    toggleConfirmed(state, action: PayloadAction<string>) {
      const docNumber = action.payload;
      state.confirmedDocNumbers = state.confirmedDocNumbers.includes(docNumber)
        ? state.confirmedDocNumbers.filter((confirmed) => confirmed !== docNumber)
        : [...state.confirmedDocNumbers, docNumber];
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
    clearLastRun(state) {
      state.lastRun = null;
    },
  },
  extraReducers: (builder) => {
    // The deposit thunks live in javelinSlice because they share one contract and route.
    builder.addCase(javelinActions.previewDeposits.fulfilled, (state, action) => {
      state.plan = action.payload;
    });
    builder.addCase(javelinActions.postDeposits.fulfilled, (state, action) => {
      state.lastRun = action.payload;
    });
  },
});

export const depositActions = depositSlice.actions;

const depositReducer = depositSlice.reducer;
export default depositReducer;
