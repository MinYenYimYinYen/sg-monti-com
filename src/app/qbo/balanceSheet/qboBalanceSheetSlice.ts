import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboBalanceSheetContract } from "@/app/qbo/balanceSheet/api/QboBalanceSheetContract";
import { QboAccountBalance } from "@/app/qbo/balanceSheet/types/QboBalanceSheetTypes";

// Balances are read from QuickBooks on demand and held only so a screen can show them. The
// server is the source of truth. A caller that acts on a balance must send it back and let the
// server re-read it, never trust this copy.
const getQboAccountBalance = createStandardThunk<QboBalanceSheetContract, "getAccountBalance">({
  typePrefix: "qboBalanceSheet/getAccountBalance",
  apiPath: "/qbo/balanceSheet/api",
  opName: "getAccountBalance",
});

type QboBalanceSheetState = {
  /** Newest first load wins per account and date. */
  accountBalances: QboAccountBalance[];
};

const initialState: QboBalanceSheetState = { accountBalances: [] };

const qboBalanceSheetSlice = createSlice({
  name: "qboBalanceSheet",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // A balance changes with every posting, so the held figure is dropped while a fresh read is in
    // flight. A screen then shows "reading" and can never act on an old number.
    builder.addCase(getQboAccountBalance.pending, (state, action) => {
      const { accountId, asOfDate } = action.meta.arg.params;
      state.accountBalances = state.accountBalances.filter(
        (held) => !(held.accountId === accountId && held.asOfDate === asOfDate),
      );
    });
    builder.addCase(getQboAccountBalance.fulfilled, (state, action) => {
      const loaded = action.payload;
      const index = state.accountBalances.findIndex(
        (held) => held.accountId === loaded.accountId && held.asOfDate === loaded.asOfDate,
      );
      if (index >= 0) state.accountBalances[index] = loaded;
      else state.accountBalances.push(loaded);
    });
  },
});

export const qboBalanceSheetActions = { ...qboBalanceSheetSlice.actions, getQboAccountBalance };
export const qboBalanceSheetReducer = qboBalanceSheetSlice.reducer;
