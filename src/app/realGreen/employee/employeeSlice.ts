import {
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { Employee } from "@/app/realGreen/employee/EmployeeTypes";
import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract";
import { Grouper } from "@/lib/Grouper";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

// 1. STATE: Thin. No loading flags.
type EmployeeState = {
  employees: Employee[];
};

const initialState: EmployeeState = {
  employees: [],
};

// 2. THUNK
const getEmployees = createStandardThunk<EmployeeContract, "getAll">({
  typePrefix: "employee/getEmployees",
  apiPath: "/realGreen/employee/api",
  opName: "getAll",
});

// 3. SLICE
export const employeeSlice = createSlice({
  name: "employee",
  initialState,
  reducers: {
    // Optional: Useful for logout
    clearEmployees: (state) => {
      state.employees = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getEmployees.fulfilled, (state, action) => {
      state.employees = action.payload;
    });
  },
  selectors: {
    allEmployees: (state) => state.employees,
    // Memoized selector example:
    activeEmployees: createSelector(
      [(state: EmployeeState) => state.employees],
      (employees) => employees.filter((employee) => employee.active),
    ),
    employeeMap: (state) =>
      new Grouper(state.employees).toUniqueMap((e) => e.employeeId),
  },
});

export default employeeSlice.reducer;
// Exporting the thunk as part of the actions object is a nice convention
export const employeeActions = { ...employeeSlice.actions, getEmployees };
export const employeeSelect = { ...employeeSlice.selectors };
