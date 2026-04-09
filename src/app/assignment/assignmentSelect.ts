import { AppState } from "@/store";

const selectLoadedByEmpIdAndSchedDate = (state: AppState, employeeId: string, schedDate: string) => {
  return state.assignment.byEmployeeIdAndSchedDate;
};

export const assignmentSelect = {
  loadedByEmpIdAndSchedDate: selectLoadedByEmpIdAndSchedDate,
}