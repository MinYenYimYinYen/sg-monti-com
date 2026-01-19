import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { WithConfig } from "@/store/reduxUtil/reduxTypes"; // Your new shared type
import { Employee } from "@/app/realGreen/employee/Employee";
import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract";
import { api } from "@/lib/api/api";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { AppState } from "@/store";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

// 1. STATE: Thin. No loading flags.
type EmployeeState = {
  employees: Employee[];
};

const initialState: EmployeeState = {
  employees: [],
};

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

// 2. THUNK
const getEmployees = createAsyncThunk<
  Employee[], // Return Data Only
  WithConfig<EmployeeContract["getAll"]["params"]>, // Input: API Params + ThunkConfig
  { rejectValue: string; state: AppState }
>(
  "employee/getEmployees",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<EmployeeContract> = {
      op: "getAll",
      ...params,
    };

    console.log("executing getEmployees");
    const res = await api<EmployeeContract["getAll"]["result"]>(
      "/realGreen/employee/api",
      {
        method: "POST",
        body,
      },
    );

    if (!res.success) return rejectWithValue(res.message);
    return res.items;
  },
  smartThunkOptions({ typePrefix: "employee/getEmployees" }),
);
export default employeeSlice.reducer;
// Exporting the thunk as part of the actions object is a nice convention
export const employeeActions = { ...employeeSlice.actions, getEmployees };
export const employeeSelect = { ...employeeSlice.selectors };
