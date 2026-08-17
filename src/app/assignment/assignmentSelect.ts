import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectByEmployeeIdAndSchedDate = (state: AppState) =>
  state.assignment.byEmployeeIdAndSchedDate;

const selectBySchedDate = (state: AppState) => state.assignment.bySchedDate;

const selectAvailableDates = (state: AppState) => state.assignment.availableDates;

const selectBySchedDateRange = (state: AppState) => state.assignment.bySchedDateRange;

const selectServIdsForDate = createSelector(
  [selectBySchedDate],
  (assignments) => assignments.map((a) => a.servId),
);

const selectTechsForDate = createSelector(
  [selectBySchedDate],
  (assignments) => Array.from(new Set(assignments.map((a) => a.employeeId))).sort(),
);

const selectServIdsByEmployee = createSelector(
  [selectBySchedDate],
  (assignments) => new Grouper(assignments).groupBy((a) => a.employeeId).toMap(),
);

const selectAssignmentsByEmployeeForRange = createSelector(
  [selectBySchedDateRange],
  (assignments) => new Grouper(assignments).groupBy((a) => a.employeeId).toMap(),
);

export const assignmentSelect = {
  loadedByEmpIdAndSchedDate: selectByEmployeeIdAndSchedDate,
  bySchedDate: selectBySchedDate,
  availableDates: selectAvailableDates,
  bySchedDateRange: selectBySchedDateRange,
  servIdsForDate: selectServIdsForDate,
  techsForDate: selectTechsForDate,
  servIdsByEmployee: selectServIdsByEmployee,
  assignmentsByEmployeeForRange: selectAssignmentsByEmployeeForRange,
};
