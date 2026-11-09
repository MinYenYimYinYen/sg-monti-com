import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboCustomerContract } from "@/app/qbo/customer/api/QboCustomerContract";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";

// Customers are loaded from QuickBooks each session and held here, cut down to the fields the
// mapping screen needs. There is no Mongo mirror (see "Loading reference data" in
// planning/qboPlan.md).
const getQboCustomers = createStandardThunk<QboCustomerContract, "getAll">({
  typePrefix: "qboCustomer/getAll",
  apiPath: "/qbo/customer/api",
  opName: "getAll",
});

type QboCustomerState = {
  customers: QboCustomerSummary[];
};

const initialState: QboCustomerState = {
  customers: [],
};

const qboCustomerSlice = createSlice({
  name: "qboCustomer",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getQboCustomers.fulfilled, (state, action) => {
      state.customers = action.payload;
    });
  },
});

export const qboCustomerActions = { ...qboCustomerSlice.actions, getQboCustomers };
export const qboCustomerReducer = qboCustomerSlice.reducer;
