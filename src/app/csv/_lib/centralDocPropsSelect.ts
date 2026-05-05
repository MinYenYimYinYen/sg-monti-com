import { AppState } from "@/store";

const selectAssignments = (state: AppState) => state.centralDocProps.assignments;
const selectAssignmentWriteErrors = (state: AppState) => state.centralDocProps.assignmentWriteErrors;

export const centralDocPropsSelect = {
  assignments: selectAssignments,
  assignmentWriteErrors: selectAssignmentWriteErrors,
};
