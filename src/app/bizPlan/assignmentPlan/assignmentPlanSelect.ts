import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
const selectAssignmentPlans = (state: AppState) =>
  state.assignmentPlan.assignmentPlans;

const selectAssignmentsByServCodeId = createSelector(
  [selectAssignmentPlans],
  (assignmentPlans) => {
    return new Grouper(assignmentPlans).toUniqueMap((ap) => ap.servCodeId);
  },
);

export const assignmentPlanSelect = {
  assignmentPlans: selectAssignmentPlans,
  assignmentsByServCodeId: selectAssignmentsByServCodeId,
};
