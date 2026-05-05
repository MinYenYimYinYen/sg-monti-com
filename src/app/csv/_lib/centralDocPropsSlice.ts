import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CSVContract } from "@/app/csv/api/csvContract";
import { WriteError } from "mongodb";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

type CentralDocPropsState = {
  assignments: AssignmentDoc[];
  assignmentWriteErrors: WriteError[] | null;

};

const initialState: CentralDocPropsState = {
  assignments: [],
  assignmentWriteErrors: null,
};

export const centralDocPropsSlice = createSlice({
  name: "centralDocProps",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(saveAssignments.fulfilled, (state, action) => {
      state.assignments = action.payload.assignments;
      state.assignmentWriteErrors = action.payload.errors;
    });
  },
});

const saveAssignments = createStandardThunk<CSVContract, "saveAssignments">({
  typePrefix: "centralDocProps/saveAssignments",
  apiPath: "/csv/api",
  opName: "saveAssignments",
});


export const centralDocPropsActions = {
  ...centralDocPropsSlice.actions,
  saveAssignments,
};

export default centralDocPropsSlice.reducer;
