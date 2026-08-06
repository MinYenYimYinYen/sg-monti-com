import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { flattenEntries } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;

const selectEmployees = createSelector(
  [selectEmployeeDocs, assignmentPlanSelect.assignmentsByEmployeeId, plannedTimeOffSelect.byEmployeeId],
  (employeeDocs, assignmentsByEmployeeId, ptoByEmployeeId): Employee[] =>
    employeeDocs.map((doc): Employee => {
      const plan = assignmentsByEmployeeId.get(doc.employeeId);
      // Flatten entries to a plain servCodeIds array for backward-compat consumers
      const servCodeIds = plan ? flattenEntries(plan.entries) : [];
      const plannedTimeOff = ptoByEmployeeId.get(doc.employeeId) ?? [];
      return { ...doc, servCodeIds, plannedTimeOff };
    }),
);

const selectEmployeeMap = createSelector([selectEmployees], (employees) => {
  return new Grouper(employees).toUniqueMap((e) => e.employeeId);
});

export const employeeSelect = {
  employees: selectEmployees,
  employeeMap: selectEmployeeMap,
};
