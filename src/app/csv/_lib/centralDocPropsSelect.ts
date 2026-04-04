import { AppState } from "@/store";

const selectAssignments = (state: AppState) => state.centralDocProps.assignments;
const selectAssignmentWriteErrors = (state: AppState) => state.centralDocProps.assignmentWriteErrors;
const selectPendingEtas = (state: AppState) => state.centralDocProps.pendingEtas;

export const centralDocPropsSelect = {
  assignments: selectAssignments,
  assignmentWriteErrors: selectAssignmentWriteErrors,
  pendingEtas: selectPendingEtas,
};
