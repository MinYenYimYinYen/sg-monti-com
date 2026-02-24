import { Assignment } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CSVContract } from "@/app/csv/api/csvContract";
import { WriteError } from "mongodb";

type CSVState = {
  assignments: Assignment[];
  assignmentWriteErrors: WriteError[] | null;
};

const initialState: CSVState = {
  assignments: [],
  assignmentWriteErrors: null,
};

export const csvSlice = createSlice({
  name: "csv",
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
  typePrefix: "csv",
  apiPath: "/csv/api",
  opName: "saveAssignments",
});

export const csvActions = { ...csvSlice.actions, saveAssignments };

export default csvSlice.reducer;
