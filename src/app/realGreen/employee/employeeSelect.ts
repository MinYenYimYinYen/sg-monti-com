import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;
const selectEmployees = createSelector([selectEmployeeDocs], (employeeDocs) => {
  return employeeDocs.map((doc) => doc as Employee); // Mock Hydration
});

const selectEmployeeMap = createSelector([selectEmployees], (employees) => {
  return new Grouper(employees).toUniqueMap((e) => e.employeeId)
})

export const employeeSelect = {
  employees: selectEmployees,
  employeeMap: selectEmployeeMap,
};
