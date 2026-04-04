import { AssignmentDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CSVContract } from "@/app/csv/api/csvContract";
import { WriteError } from "mongodb";

type CentralDocPropsState = {
  assignments: AssignmentDoc[];
  assignmentWriteErrors: WriteError[] | null;
  /** Optimistic ETA overrides keyed by servId. Merged into Service.eta in centralSelectors. */
  pendingEtas: Record<number, string | null>;
};

const initialState: CentralDocPropsState = {
  assignments: [],
  assignmentWriteErrors: null,
  pendingEtas: {},
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

    builder.addCase(saveEta.pending, (state, action) => {
      // Optimistic update so the UI reflects the change immediately
      const { servId, eta } = action.meta.arg.params;
      state.pendingEtas[servId] = eta;
    });

    builder.addCase(saveEta.fulfilled, (state, action) => {
      state.pendingEtas[action.payload.servId] = action.payload.eta;
    });

    builder.addCase(saveEta.rejected, (state, action) => {
      // On failure, remove the optimistic entry so the stale server value shows
      const servId = action.meta.arg.params.servId;
      delete state.pendingEtas[servId];
    });
  },
});

const saveAssignments = createStandardThunk<CSVContract, "saveAssignments">({
  typePrefix: "centralDocProps/saveAssignments",
  apiPath: "/csv/api",
  opName: "saveAssignments",
});

const saveEta = createStandardThunk<CSVContract, "saveEta">({
  typePrefix: "centralDocProps/saveEta",
  apiPath: "/csv/api",
  opName: "saveEta",
});

export const centralDocPropsActions = {
  ...centralDocPropsSlice.actions,
  saveAssignments,
  saveEta,
};

export default centralDocPropsSlice.reducer;
