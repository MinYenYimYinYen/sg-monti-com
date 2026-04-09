import { createSlice } from "@reduxjs/toolkit";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

type AssignmentState = {
  byEmployeeIdAndSchedDate: AssignmentDoc[];
};

const initialState: AssignmentState = { byEmployeeIdAndSchedDate: [] };

const getByEmployeeIdAndSchedDate = createStandardThunk<
  AssignmentContract,
  "getByEmployeeIdAndSchedDate"
>({
  typePrefix: "assignment/getByEmployeeIdAndSchedDate",
  apiPath: "/assignment/api",
  opName: "getByEmployeeIdAndSchedDate",
});

const assignmentSlice = createSlice({
  name: "assignment",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getByEmployeeIdAndSchedDate.fulfilled, (state, action) => {
      state.byEmployeeIdAndSchedDate = action.payload;
    });
  },
});

export default assignmentSlice.reducer;
export const assignmentActions = {
  ...assignmentSlice.actions,
  getByEmployeeIdAndSchedDate,
};
