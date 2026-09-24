import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { TRange } from "@/lib/primatives/tRange/TRange";

const selectDocs = (state: AppState) => state.assignment.docs;

const selectAvailableDates = (state: AppState) => state.assignment.availableDates;

// O(1) lookup map by servId
const selectByServId = createSelector(
  [selectDocs],
  (docs) => new Map(docs.map((d) => [d.servId, d])),
);

// All servIds currently loaded
const selectLoadedServIds = createSelector(
  [selectDocs],
  (docs) => new Set(docs.map((d) => d.servId)),
);

// Grouped by employeeId — for loadout start/feedback (single-date context)
const selectServIdsByEmployee = createSelector(
  [selectDocs],
  (docs) => new Grouper(docs).groupBy((d) => d.employeeId).toMap(),
);

// All unique techs across all loaded docs
const selectTechsForDate = (schedDate: string) =>
  createSelector([selectDocs], (docs) =>
    Array.from(new Set(docs.filter((d) => d.schedDate === schedDate).map((d) => d.employeeId))).sort(),
  );

// ServIds for a specific date — used by loadout page to trigger customer data fetch
const selectServIdsForDate = (schedDate: string) =>
  createSelector([selectDocs], (docs) =>
    docs.filter((d) => d.schedDate === schedDate).map((d) => d.servId),
  );

// Assignments for a specific employee on a specific date — replaces byEmployeeIdAndSchedDate bucket
const selectByEmployeeAndSchedDate = (employeeId: string, schedDate: string) =>
  createSelector([selectDocs], (docs) =>
    docs.filter((d) => d.employeeId === employeeId && d.schedDate === schedDate),
  );

// ServIds for a specific employee on a specific date — used by feedbackSelect
const selectServIdsByEmployeeAndSchedDate = (employeeId: string, schedDate: string) =>
  createSelector([selectDocs], (docs) =>
    docs
      .filter((d) => d.employeeId === employeeId && d.schedDate === schedDate)
      .map((d) => d.servId),
  );

// Assignments within a date range, grouped by employeeId — used by productivity/reliability
const selectAssignmentsByEmployeeForRange = (dateRange: TRange<string>) =>
  createSelector([selectDocs], (docs) => {
    const inRange = docs.filter(
      (d) => d.schedDate >= dateRange.min && d.schedDate <= dateRange.max,
    );
    return new Grouper(inRange).groupBy((d) => d.employeeId).toMap();
  });

export const assignmentSelect = {
  docs: selectDocs,
  availableDates: selectAvailableDates,
  byServId: selectByServId,
  loadedServIds: selectLoadedServIds,
  servIdsByEmployee: selectServIdsByEmployee,
  techsForDate: selectTechsForDate,
  servIdsForDate: selectServIdsForDate,
  byEmployeeAndSchedDate: selectByEmployeeAndSchedDate,
  servIdsByEmployeeAndSchedDate: selectServIdsByEmployeeAndSchedDate,
  assignmentsByEmployeeForRange: selectAssignmentsByEmployeeForRange,
};
