import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CkDepositDraftRow, CkDepositState } from "@/app/javelin/JavelinTypes";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { blankDraftRow, removePostedRows } from "@/app/javelin/_lib/ckDepositRows";

// The rows live here, not in component state, so they survive switching tabs. The server answers
// every plan and post; this only holds what the user typed and what the server said.
const initialState: CkDepositState = {
  rows: [blankDraftRow()],
  confirmedDocNumbers: [],
  plan: [],
  lastRun: null,
};

const ckDepositSlice = createSlice({
  name: "ckDeposit",
  initialState,
  reducers: {
    setDate(state, action: PayloadAction<{ index: number; date: string }>) {
      const { index, date } = action.payload;
      if (!state.rows[index]) return;
      state.rows[index].date = date;
      // A plan and its confirmations describe the rows they were made from.
      state.plan = [];
      state.confirmedDocNumbers = [];
    },
    setAmount(state, action: PayloadAction<{ index: number; amount: string }>) {
      const { index, amount } = action.payload;
      if (!state.rows[index]) return;
      state.rows[index].amount = amount;
      state.plan = [];
      state.confirmedDocNumbers = [];
    },
    addRow(state) {
      state.rows.push(blankDraftRow());
    },
    removeRow(state, action: PayloadAction<number>) {
      state.rows.splice(action.payload, 1);
      if (state.rows.length === 0) state.rows.push(blankDraftRow());
      state.plan = [];
      state.confirmedDocNumbers = [];
    },
    clearRows(state) {
      state.rows = [blankDraftRow()];
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
    // The check deposit thunks live in javelinSlice because they share one contract and route.
    builder.addCase(javelinActions.previewCkDeposits.fulfilled, (state, action) => {
      state.plan = action.payload;
    });
    builder.addCase(javelinActions.postCkDeposits.fulfilled, (state, action) => {
      state.lastRun = action.payload;
      // Posted rows leave the list, so checking again cannot number them as second deposits.
      const posted = action.payload.results
        .filter((result) => result.outcome === "posted")
        .map((result) => ({
          txnDate: result.posting.txnDate,
          totalCents: result.posting.totalCents,
        }));
      state.rows = removePostedRows({ rows: state.rows as CkDepositDraftRow[], posted });
      state.plan = [];
      state.confirmedDocNumbers = [];
    });
  },
});

export const ckDepositActions = ckDepositSlice.actions;

const ckDepositReducer = ckDepositSlice.reducer;
export default ckDepositReducer;
