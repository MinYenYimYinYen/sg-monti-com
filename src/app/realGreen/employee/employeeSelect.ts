import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { flattenEntries } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;

const selectEmployees = createSelector(
  [selectEmployeeDocs, assignmentPlanSelect.assignmentsByEmployeeId],
  (employeeDocs, assignmentsByEmployeeId): Employee[] =>
    employeeDocs.map((doc) => {
      const plan = assignmentsByEmployeeId.get(doc.employeeId);
      // Flatten entries to a plain servCodeIds array for backward-compat consumers
      const servCodeIds = plan ? flattenEntries(plan.entries) : [];
      return { ...doc, servCodeIds };
    }),
);

const selectEmployeeMap = createSelector([selectEmployees], (employees) => {
  return new Grouper(employees).toUniqueMap((e) => e.employeeId);
});

export const employeeSelect = {
  employees: selectEmployees,
  employeeMap: selectEmployeeMap,
};
