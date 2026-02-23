import { Assignment } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CSVContract } from "@/app/csv/api/csvContract";

type CSVState = {
  assignments: Assignment[];
};

const initialState: CSVState = {
  assignments: [],
};

export const csvSlice = createSlice({
  name: "csv",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(saveAssignments.fulfilled, (state, action) => {
      state.assignments = action.payload;
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
