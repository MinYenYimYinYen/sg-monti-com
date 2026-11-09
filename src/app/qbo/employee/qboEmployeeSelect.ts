import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectEmployees = (state: AppState) => state.qboEmployee.employees;

const selectEmployeeMap = createSelector([selectEmployees], (employees) =>
  new Grouper(employees).toUniqueMap((e) => e.Id),
);

export const qboEmployeeSelect = {
  employees: selectEmployees,
  employeeMap: selectEmployeeMap,
};
