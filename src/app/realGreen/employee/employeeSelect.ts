import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;

const selectEmployees = createSelector(
  [selectEmployeeDocs, assignmentPlanSelect.assignmentsByEmployeeId],
  (employeeDocs, assignmentsByEmployeeId): Employee[] =>
    employeeDocs.map((doc) => ({
      ...doc,
      servCodeIds: assignmentsByEmployeeId.get(doc.employeeId)?.servCodeIds ?? [],
    })),
);

const selectEmployeeMap = createSelector([selectEmployees], (employees) => {
  return new Grouper(employees).toUniqueMap((e) => e.employeeId);
});

export const employeeSelect = {
  employees: selectEmployees,
  employeeMap: selectEmployeeMap,
};
