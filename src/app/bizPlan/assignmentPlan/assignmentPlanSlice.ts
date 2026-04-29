import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { AssignmentPlanContract } from "@/app/bizPlan/assignmentPlan/api/AssignmentPlanContract";
import { AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

type AssignmentPlanState = {
  assignmentPlans: AssignmentPlan[];
};

const initialState: AssignmentPlanState = { assignmentPlans: [] };

const assignmentPlanSlice = createSlice({
  name: "assignmentPlans",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getAssignmentPlans.fulfilled, (state, action) => {
      state.assignmentPlans = action.payload;
    });
    builder.addCase(upsertAssignmentPlan.fulfilled, (state, action) => {
      const updatedAssignmentPlan = action.payload;
      const existingIndex = state.assignmentPlans.findIndex(
        (doc) => doc.servCodeId === updatedAssignmentPlan.servCodeId,
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
