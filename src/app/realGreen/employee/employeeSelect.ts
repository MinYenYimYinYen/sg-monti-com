import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
import { employeeAvailabilitySelect } from "@/app/employeeAvailability/employeeAvailabilitySelect";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;

function getNameLastFirst(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) {
    return parts[0];
  }
  const partsAfter1st = parts.slice(1).join(" ");
  return `${partsAfter1st}, ${parts[0]}`
}

const selectEmployees = createSelector(
  [
    selectEmployeeDocs,
    assignmentPlanSelect.assignmentsByServCodeId,
    plannedTimeOffSelect.byEmployeeId,
    employeeAvailabilitySelect.byEmployeeId,
  ],
  (employeeDocs, assignmentsByServCodeId, ptoByEmployeeId, availabilityByEmployeeId): Employee[] => {
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
      // Employees with no availability record get { employeeId } — no restrictions.
      const availability = availabilityByEmployeeId.get(doc.employeeId) ?? { employeeId: doc.employeeId };
      const nameLastFirst = getNameLastFirst(doc.name);
      return { ...doc, servCodeIds, plannedTimeOff, availability, nameLastFirst };
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
