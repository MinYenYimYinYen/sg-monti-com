import { createSlice } from "@reduxjs/toolkit";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

type AssignmentState = {
  byEmployeeIdAndSchedDate: AssignmentDoc[];
  bySchedDate: AssignmentDoc[];
  availableDates: string[];
  bySchedDateRange: AssignmentDoc[];
};

const initialState: AssignmentState = {
  byEmployeeIdAndSchedDate: [],
  bySchedDate: [],
  availableDates: [],
  bySchedDateRange: [],
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

const getBySchedDateRange = createStandardThunk<AssignmentContract, "getBySchedDateRange">({
  typePrefix: "assignment/getBySchedDateRange",
  apiPath: "/assignment/api",
  opName: "getBySchedDateRange",
});

const assignmentSlice = createSlice({
  name: "assignment",
  initialState,
  reducers: {
    clearByEmployeeIdAndSchedDate: (state) => {
      state.byEmployeeIdAndSchedDate = [];
    },
  },
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
    builder.addCase(getBySchedDateRange.fulfilled, (state, action) => {
      state.bySchedDateRange = action.payload;
    });
  },
});

export default assignmentSlice.reducer;
export const assignmentActions = {
  ...assignmentSlice.actions,
  getByEmployeeIdAndSchedDate,
  getBySchedDate,
  getAvailableDates,
  getBySchedDateRange,
};
