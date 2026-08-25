import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;

const selectEmployees = createSelector(
  [selectEmployeeDocs, assignmentPlanSelect.assignmentsByServCodeId, plannedTimeOffSelect.byEmployeeId],
  (employeeDocs, assignmentsByServCodeId, ptoByEmployeeId): Employee[] => {
    // Build a map of employeeId → servCodeIds from the inverted servCode map
    const servCodeIdsByEmployee = new Map<string, string[]>();
    for (const [servCodeId, employeeIds] of assignmentsByServCodeId) {
      for (const employeeId of employeeIds) {
        const existing = servCodeIdsByEmployee.get(employeeId) ?? [];
        existing.push(servCodeId);
        servCodeIdsByEmployee.set(employeeId, existing);
      }
    }

    return employeeDocs.map((doc): Employee => {
      const servCodeIds = servCodeIdsByEmployee.get(doc.employeeId) ?? [];
      const plannedTimeOff = ptoByEmployeeId.get(doc.employeeId) ?? [];
      return { ...doc, servCodeIds, plannedTimeOff };
    });
  },
);


const selectEmployeeMap = createSelector([selectEmployees], (employees) => {
  return new Grouper(employees).toUniqueMap((e) => e.employeeId);
});

export const employeeSelect = {
  employees: selectEmployees,
  employeeMap: selectEmployeeMap,
};
