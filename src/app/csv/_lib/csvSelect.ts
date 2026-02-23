import { AppState } from "@/store";
// import { createSelector } from "@reduxjs/toolkit";
// import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectAssignments = (state: AppState) => state.csv.assignments;
// const selectAssignmentMap = createSelector([selectAssignments], (assignments) =>
//   new Grouper(assignments).toUniqueMap((a) => a.servId),
// );

export const csvSelect = {
  assignments: selectAssignments,
  // assignmentMap: selectAssignmentMap,
};
