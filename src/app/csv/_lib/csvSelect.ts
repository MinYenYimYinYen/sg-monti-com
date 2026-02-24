import { AppState } from "@/store";

const selectAssignments = (state: AppState) => state.csv.assignments;
const selectAssignmentWriteErrors = (state: AppState) => state.csv.assignmentWriteErrors;


export const csvSelect = {
  assignments: selectAssignments,
  assignmentWriteErrors: selectAssignmentWriteErrors,
};
