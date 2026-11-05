import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboVendorContract } from "@/app/qbo/vendor/api/QboVendorContract";
import { QboVendorCreateResult, QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { addVendorToList } from "@/app/qbo/vendor/_lib/qboVendorUtils";

// Vendors are loaded from QuickBooks each session and held here, cut down to the fields the
// mapping screen needs. There is no Mongo mirror (see "Loading reference data" in
// planning/qboPlan.md). A vendor created in this session is added to the list on success, so
// the session stays in sync without a reload.
const getQboVendors = createStandardThunk<QboVendorContract, "getAll">({
  typePrefix: "qboVendor/getAll",
  apiPath: "/qbo/vendor/api",
  opName: "getAll",
});

// No customCondition: a create must always reach the server. The standard dedup still drops a
// second click with identical params while the first is in flight, which is what we want.
const createQboVendor = createStandardThunk<QboVendorContract, "createVendor">({
  typePrefix: "qboVendor/createVendor",
  apiPath: "/qbo/vendor/api",
  opName: "createVendor",
});

/**
 * Explicit status for the "New vendor" dialog, so it can show a result without reading the
 * thunk's return value. `vendorCreateResult` is what the last create came to.
 */
export type QboVendorCreateStatus = "idle" | "pending" | "settled" | "error";

type QboVendorState = {
  vendors: QboVendorSummary[];
  vendorCreateStatus: QboVendorCreateStatus;
  vendorCreateResult: QboVendorCreateResult | null;
};

const initialState: QboVendorState = {
  vendors: [],
  vendorCreateStatus: "idle",
  vendorCreateResult: null,
};

const qboVendorSlice = createSlice({
  name: "qboVendor",
  initialState,
  reducers: {
    resetVendorCreate: (state) => {
      state.vendorCreateStatus = "idle";
      state.vendorCreateResult = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getQboVendors.fulfilled, (state, action) => {
      state.vendors = action.payload;
    });

    builder.addCase(createQboVendor.pending, (state) => {
      state.vendorCreateStatus = "pending";
      state.vendorCreateResult = null;
    });
    builder.addCase(createQboVendor.fulfilled, (state, action) => {
      const result = action.payload;
      state.vendorCreateStatus = "settled";
      state.vendorCreateResult = result;
      if (result.status === "created" || result.status === "exists") {
        state.vendors = addVendorToList({ vendors: state.vendors, vendor: result.vendor });
      }
    });
    builder.addCase(createQboVendor.rejected, (state) => {
      state.vendorCreateStatus = "error";
    });
  },
});

export const qboVendorActions = { ...qboVendorSlice.actions, getQboVendors, createQboVendor };
export const qboVendorReducer = qboVendorSlice.reducer;
