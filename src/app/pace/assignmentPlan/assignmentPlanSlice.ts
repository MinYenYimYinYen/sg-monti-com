import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AssignmentPlanContract } from "@/app/pace/assignmentPlan/api/AssignmentPlanContract";
import { AssignmentPlan, GroupAssignment, Scenario } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";

type AssignmentPlanState = {
  assignmentPlans: AssignmentPlan[];
  scenarios: Scenario[];
};

const initialState: AssignmentPlanState = { assignmentPlans: [], scenarios: [] };

const getScenarios = createStandardThunk<AssignmentPlanContract, "getScenarios">({
  opName: "getScenarios",
  apiPath: "/pace/assignmentPlan/api",
  typePrefix: "pace/assignmentPlan/getScenarios",
});

const upsertScenario = createStandardThunk<AssignmentPlanContract, "upsertScenario">({
  opName: "upsertScenario",
  apiPath: "/pace/assignmentPlan/api",
  typePrefix: "pace/assignmentPlan/upsertScenario",
});

const deleteScenario = createStandardThunk<AssignmentPlanContract, "deleteScenario">({
  opName: "deleteScenario",
  apiPath: "/pace/assignmentPlan/api",
  typePrefix: "pace/assignmentPlan/deleteScenario",
});

const activateScenario = createStandardThunk<AssignmentPlanContract, "activateScenario">({
  opName: "activateScenario",
  apiPath: "/pace/assignmentPlan/api",
  typePrefix: "pace/assignmentPlan/activateScenario",
});

const assignmentPlanSlice = createSlice({
  name: "paceAssignmentPlan",
  initialState,
  reducers: {
    reorderGroupAssignments: (
      state,
      action: PayloadAction<{ employeeId: string; groupAssignments: GroupAssignment[] }>,
    ) => {
      const { employeeId, groupAssignments } = action.payload;
      const idx = state.assignmentPlans.findIndex((ap) => ap.employeeId === employeeId);
      if (idx !== -1) {
        state.assignmentPlans[idx] = { ...state.assignmentPlans[idx], groupAssignments };
      } else {
        state.assignmentPlans.push({ employeeId, groupAssignments });
      }
    },
    setGoal: (
      state,
      action: PayloadAction<{ employeeId: string; groupId: string; dailyRevenueGoal: number | null }>,
    ) => {
      const { employeeId, groupId, dailyRevenueGoal } = action.payload;
      const plan = state.assignmentPlans.find((ap) => ap.employeeId === employeeId);
      if (!plan) return;
      const ga = plan.groupAssignments.find((g) => g.groupId === groupId);
      if (ga) ga.dailyRevenueGoal = dailyRevenueGoal;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getScenarios.fulfilled, (state, action) => {
      state.scenarios = action.payload;
      const active = action.payload.find((s) => s.isActive);
      if (active) {
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

export const paceAssignmentPlanActions = {
  ...assignmentPlanSlice.actions,
  getScenarios,
  upsertScenario,
  deleteScenario,
  activateScenario,
};

export const paceAssignmentPlanReducer = assignmentPlanSlice.reducer;
