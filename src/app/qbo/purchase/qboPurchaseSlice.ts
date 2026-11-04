import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboPurchaseContract } from "@/app/qbo/purchase/api/QboPurchaseContract";
import { QboPurchaseRange, QboPurchaseSummary } from "@/app/qbo/purchase/types/QboPurchaseTypes";

// Purchases are loaded from QuickBooks for one date range at a time and replace what was held
// before. There is no Mongo mirror (see "Loading reference data" in planning/qboPlan.md). The
// thunk has no staleTime or force, so the standard rule applies: a second dispatch while one is
// running is ignored.
const getQboPurchases = createStandardThunk<QboPurchaseContract, "getByDateRange">({
  typePrefix: "qboPurchase/getByDateRange",
  apiPath: "/qbo/purchase/api",
  opName: "getByDateRange",
});

type QboPurchaseState = {
  purchases: QboPurchaseSummary[];
  /** The range the held purchases were loaded for. Null until the first load. */
  loadedRange: QboPurchaseRange | null;
};

const initialState: QboPurchaseState = {
  purchases: [],
  loadedRange: null,
};

const qboPurchaseSlice = createSlice({
  name: "qboPurchase",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getQboPurchases.fulfilled, (state, action) => {
      state.purchases = action.payload;
      state.loadedRange = action.meta.arg.params;
    });
  },
});

export const qboPurchaseActions = { ...qboPurchaseSlice.actions, getQboPurchases };
export const qboPurchaseReducer = qboPurchaseSlice.reducer;
