import { AppState } from "@/store";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { createSelector } from "@reduxjs/toolkit";

const selectEmployeeDocs = (state: AppState) => state.employee.employeeDocs;
const selectEmployees = createSelector([selectEmployeeDocs], (employeeDocs) => {
  return employeeDocs.map((doc) => doc as Employee); // Mock Hydration
});

export const employeeSelect = {
  employees: selectEmployees,
};
