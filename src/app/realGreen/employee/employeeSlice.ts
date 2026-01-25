import {
  createSlice,
} from "@reduxjs/toolkit";
import { EmployeeDoc} from "@/app/realGreen/employee/types/EmployeeTypes";
import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

// 1. STATE: Thin. No loading flags.
type EmployeeState = {
  employeeDocs: EmployeeDoc[];
};

const initialState: EmployeeState = {
  employeeDocs: [],
};

// 2. THUNK
const getEmployeeDocs = createStandardThunk<EmployeeContract, "getAll">({
  typePrefix: "employee/getEmployeeDocs",
  apiPath: "/realGreen/employee/api",
  opName: "getAll",
});

// 3. SLICE
export const employeeSlice = createSlice({
  name: "employee",
  initialState,
  reducers: {
    // todo: write a useRealGreen hook that
    //  clears all realGreen state on logout
    //  First, all slices need a clearDocs reducer
    clearEmployeeDocs: (state) => {
      state.employeeDocs = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getEmployeeDocs.fulfilled, (state, action) => {
      state.employeeDocs = action.payload;
    });
  },

});

export default employeeSlice.reducer;
// Exporting the thunk as part of the actions object is a nice convention
export const employeeActions = { ...employeeSlice.actions, getEmployees: getEmployeeDocs };
