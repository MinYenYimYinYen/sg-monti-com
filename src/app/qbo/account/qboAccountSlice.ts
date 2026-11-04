import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboAccountContract } from "@/app/qbo/account/api/QboAccountContract";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";

// Accounts are loaded from QuickBooks each session and held here. There is no Mongo mirror
// (see "Loading reference data" in planning/qboPlan.md).
const getQboAccounts = createStandardThunk<QboAccountContract, "getAll">({
  typePrefix: "qboAccount/getAll",
  apiPath: "/qbo/account/api",
  opName: "getAll",
});

type QboAccountState = {
  accounts: QboAccount[];
};

const initialState: QboAccountState = {
  accounts: [],
};

const qboAccountSlice = createSlice({
  name: "qboAccount",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getQboAccounts.fulfilled, (state, action) => {
      state.accounts = action.payload;
    });
  },
});

export const qboAccountActions = { ...qboAccountSlice.actions, getQboAccounts };
export const qboAccountReducer = qboAccountSlice.reducer;
