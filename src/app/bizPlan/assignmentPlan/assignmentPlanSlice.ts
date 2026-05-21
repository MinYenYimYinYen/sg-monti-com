import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import { AssignmentEntry, AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

type AssignmentPlanState = {
  assignmentPlans: AssignmentPlan[];
};

const initialState: AssignmentPlanState = { assignmentPlans: [] };

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

export const assignmentPlanActions = {
  ...assignmentPlanSlice.actions,
  getAssignmentPlans,
  upsertAssignmentPlan,
};
export const assignmentPlanReducer = assignmentPlanSlice.reducer;
