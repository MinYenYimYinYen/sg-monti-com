import { createSlice } from "@reduxjs/toolkit";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

type AssignmentState = {
  byEmployeeIdAndSchedDate: AssignmentDoc[];
  bySchedDate: AssignmentDoc[];
  availableDates: string[];
};

const initialState: AssignmentState = {
  byEmployeeIdAndSchedDate: [],
  bySchedDate: [],
  availableDates: [],
};

const getByEmployeeIdAndSchedDate = createStandardThunk<
  AssignmentContract,
  "getByEmployeeIdAndSchedDate"
>({
  typePrefix: "assignment/getByEmployeeIdAndSchedDate",
  apiPath: "/assignment/api",
  opName: "getByEmployeeIdAndSchedDate",
});

const getBySchedDate = createStandardThunk<AssignmentContract, "getBySchedDate">({
  typePrefix: "assignment/getBySchedDate",
  apiPath: "/assignment/api",
  opName: "getBySchedDate",
});

const getAvailableDates = createStandardThunk<AssignmentContract, "getAvailableDates">({
  typePrefix: "assignment/getAvailableDates",
  apiPath: "/assignment/api",
  opName: "getAvailableDates",
});

const assignmentSlice = createSlice({
  name: "assignment",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getByEmployeeIdAndSchedDate.fulfilled, (state, action) => {
      state.byEmployeeIdAndSchedDate = action.payload;
    });
    builder.addCase(getBySchedDate.fulfilled, (state, action) => {
      state.bySchedDate = action.payload;
    });
    builder.addCase(getAvailableDates.fulfilled, (state, action) => {
      state.availableDates = action.payload;
    });
  },
});

export default assignmentSlice.reducer;
export const assignmentActions = {
  ...assignmentSlice.actions,
  getByEmployeeIdAndSchedDate,
  getBySchedDate,
  getAvailableDates,
};
