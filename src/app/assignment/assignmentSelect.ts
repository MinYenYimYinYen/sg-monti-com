import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectByEmployeeIdAndSchedDate = (state: AppState) =>
  state.assignment.byEmployeeIdAndSchedDate;

const selectBySchedDate = (state: AppState) => state.assignment.bySchedDate;

const selectAvailableDates = (state: AppState) => state.assignment.availableDates;

/** All servIds from the most recent getBySchedDate result. */
const selectServIdsForDate = createSelector(
  [selectBySchedDate],
  (assignments) => assignments.map((a) => a.servId),
);

/** Distinct employeeIds from the most recent getBySchedDate result. */
const selectTechsForDate = createSelector(
  [selectBySchedDate],
  (assignments) => Array.from(new Set(assignments.map((a) => a.employeeId))).sort(),
);

/** Map of employeeId → servId[] from the most recent getBySchedDate result. */
const selectServIdsByEmployee = createSelector(
  [selectBySchedDate],
  (assignments) => new Grouper(assignments).groupBy((a) => a.employeeId).toMap(),
);

export const assignmentSelect = {
  loadedByEmpIdAndSchedDate: selectByEmployeeIdAndSchedDate,
  bySchedDate: selectBySchedDate,
  availableDates: selectAvailableDates,
  servIdsForDate: selectServIdsForDate,
  techsForDate: selectTechsForDate,
  servIdsByEmployee: selectServIdsByEmployee,
};
