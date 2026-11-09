import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboEmployeeContract } from "@/app/qbo/employee/api/QboEmployeeContract";
import { QboEmployeeSummary } from "@/app/qbo/employee/types/QboEmployeeTypes";

// Employees are loaded from QuickBooks each session and held here, cut down to their names. There
// is no Mongo mirror (see "Loading reference data" in planning/qboPlan.md).
const getQboEmployees = createStandardThunk<QboEmployeeContract, "getAll">({
  typePrefix: "qboEmployee/getAll",
  apiPath: "/qbo/employee/api",
  opName: "getAll",
});

type QboEmployeeState = {
  employees: QboEmployeeSummary[];
};

const initialState: QboEmployeeState = {
  employees: [],
};

const qboEmployeeSlice = createSlice({
  name: "qboEmployee",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getQboEmployees.fulfilled, (state, action) => {
      state.employees = action.payload;
    });
  },
});

export const qboEmployeeActions = { ...qboEmployeeSlice.actions, getQboEmployees };
export const qboEmployeeReducer = qboEmployeeSlice.reducer;
