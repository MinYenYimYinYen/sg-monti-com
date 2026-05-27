import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import { AssignmentEntry, AssignmentPlan, Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

type AssignmentPlanState = {
  assignmentPlans: AssignmentPlan[];
  scenarios: Scenario[];
};

const initialState: AssignmentPlanState = { assignmentPlans: [], scenarios: [] };

const assignmentPlanSlice = createSlice({
  name: "assignmentPlans",
  initialState,
  reducers: {
    reorderEntries: (
      state,
      action: PayloadAction<{ employeeId: string; entries: AssignmentEntry[] }>,
    ) => {
      const { employeeId, entries } = action.payload;
      const idx = state.assignmentPlans.findIndex(
        (ap) => ap.employeeId === employeeId,
      );
      if (idx !== -1) {
        state.assignmentPlans[idx] = {
          ...state.assignmentPlans[idx],
          entries,
        };
      } else {
        // Create a new plan if one doesn't exist yet
        state.assignmentPlans.push({ employeeId, entries });
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getAssignmentPlans.fulfilled, (state, action) => {
      state.assignmentPlans = action.payload;
    });
    builder.addCase(upsertAssignmentPlan.fulfilled, (state, action) => {
      const updatedAssignmentPlan = action.payload;
      const existingIndex = state.assignmentPlans.findIndex(
        (doc) => doc.employeeId === updatedAssignmentPlan.employeeId,
      );
      if (existingIndex !== -1) {
        state.assignmentPlans[existingIndex] = updatedAssignmentPlan;
      } else {
        state.assignmentPlans.push(updatedAssignmentPlan);
      }
    });
    builder.addCase(getScenarios.fulfilled, (state, action) => {
      state.scenarios = action.payload;
    });
    builder.addCase(upsertScenario.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.scenarios.findIndex((s) => s.name === updated.name);
      if (idx !== -1) {
        state.scenarios[idx] = updated;
      } else {
        state.scenarios.push(updated);
      }
    });
    builder.addCase(deleteScenario.fulfilled, (state, action) => {
      const { name } = action.payload;
      state.scenarios = state.scenarios.filter((s) => s.name !== name);
    });
  },
});

const getAssignmentPlans = createStandardThunk<
  AssignmentPlanContract,
  "getAssignmentPlans"
>({
  opName: "getAssignmentPlans",
  apiPath: "/bizPlan/assignmentPlan/api",
  typePrefix: "assignmentPlans/getAssignmentPlans",
});

const upsertAssignmentPlan = createStandardThunk<
  AssignmentPlanContract,
  "upsertAssignmentPlan"
>({
  opName: "upsertAssignmentPlan",
  apiPath: "/bizPlan/assignmentPlan/api",
  typePrefix: "assignmentPlans/upsertAssignmentPlan",
});

const getScenarios = createStandardThunk<
  AssignmentPlanContract,
  "getScenarios"
>({
  opName: "getScenarios",
  apiPath: "/bizPlan/assignmentPlan/api",
  typePrefix: "assignmentPlans/getScenarios",
});

const upsertScenario = createStandardThunk<
  AssignmentPlanContract,
  "upsertScenario"
>({
  opName: "upsertScenario",
  apiPath: "/bizPlan/assignmentPlan/api",
  typePrefix: "assignmentPlans/upsertScenario",
});

const deleteScenario = createStandardThunk<
  AssignmentPlanContract,
  "deleteScenario"
>({
  opName: "deleteScenario",
  apiPath: "/bizPlan/assignmentPlan/api",
  typePrefix: "assignmentPlans/deleteScenario",
});

export const assignmentPlanActions = {
  ...assignmentPlanSlice.actions,
  getAssignmentPlans,
  upsertAssignmentPlan,
  getScenarios,
  upsertScenario,
  deleteScenario,
};
export const assignmentPlanReducer = assignmentPlanSlice.reducer;
