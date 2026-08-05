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
    builder.addCase(getScenarios.fulfilled, (state, action) => {
      state.scenarios = action.payload;
      const active = action.payload.find((s) => s.isActive);
      if (active) {
        // Only overwrite local plans if there are no unsaved changes.
        // This prevents re-navigation from wiping edits that haven't been saved yet.
        const hasLocalPlans = state.assignmentPlans.length > 0;
        const isDirty = JSON.stringify(active.plans) !== JSON.stringify(state.assignmentPlans);
        if (!hasLocalPlans || !isDirty) {
          state.assignmentPlans = active.plans;
        }
      }
    });
    builder.addCase(upsertScenario.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.scenarios.findIndex((s) => s.name === updated.name);
      if (idx !== -1) {
        state.scenarios[idx] = updated;
      } else {
        state.scenarios.push(updated);
      }
      // If the saved scenario is active, sync assignmentPlans
      if (updated.isActive) state.assignmentPlans = updated.plans;
    });
    builder.addCase(deleteScenario.fulfilled, (state, action) => {
      const { name } = action.payload;
      state.scenarios = state.scenarios.filter((s) => s.name !== name);
    });
    builder.addCase(activateScenario.fulfilled, (state, action) => {
      state.scenarios = action.payload;
      const active = action.payload.find((s) => s.isActive);
      if (active) state.assignmentPlans = active.plans;
    });
  },
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

const activateScenario = createStandardThunk<
  AssignmentPlanContract,
  "activateScenario"
>({
  opName: "activateScenario",
  apiPath: "/bizPlan/assignmentPlan/api",
  typePrefix: "assignmentPlans/activateScenario",
});

export const assignmentPlanActions = {
  ...assignmentPlanSlice.actions,
  getScenarios,
  upsertScenario,
  deleteScenario,
  activateScenario,
};
export const assignmentPlanReducer = assignmentPlanSlice.reducer;
