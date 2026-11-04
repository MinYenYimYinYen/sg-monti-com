import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboVendorContract } from "@/app/qbo/vendor/api/QboVendorContract";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";

// Vendors are loaded from QuickBooks each session and held here, cut down to the fields the
// mapping screen needs. There is no Mongo mirror (see "Loading reference data" in
// planning/qboPlan.md). Phase E adds a createVendor thunk whose fulfilled case appends the new
// vendor, so the session stays in sync without a reload.
const getQboVendors = createStandardThunk<QboVendorContract, "getAll">({
  typePrefix: "qboVendor/getAll",
  apiPath: "/qbo/vendor/api",
  opName: "getAll",
});

type QboVendorState = {
  vendors: QboVendorSummary[];
};

const initialState: QboVendorState = {
  vendors: [],
};

const qboVendorSlice = createSlice({
  name: "qboVendor",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getQboVendors.fulfilled, (state, action) => {
      state.vendors = action.payload;
    });
  },
});

export const qboVendorActions = { ...qboVendorSlice.actions, getQboVendors };
export const qboVendorReducer = qboVendorSlice.reducer;
