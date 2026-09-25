import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { AssignmentUtils } from "@/app/assignment/AssignmentUtils";

const selectDocs = (state: AppState) => state.assignment.docs;

const selectAvailableDates = (state: AppState) => state.assignment.availableDates;

// O(1) lookup map: servId → ServiceAssignmentDoc
const selectByServId = createSelector(
  [selectDocs],
  (docs) => new Map(docs.map((d) => [d.servId, d])),
);

// All servIds currently loaded
const selectLoadedServIds = createSelector(
  [selectDocs],
  (docs) => new Set(docs.map((d) => d.servId)),
);

// AssignmentUtils for a specific service — the primary access point for service-level assignment data
const selectUtilsForServId = (servId: number) =>
  createSelector(
    [selectByServId],
    (map) => new AssignmentUtils(map.get(servId)?.assignments ?? []),
  );

// Canonical techs for a specific date — for loadout start tech picker
const selectTechsForDate = (schedDate: string) =>
  createSelector([selectDocs], (docs) => {
    const canonical = docs.flatMap((doc) => {
      const entry = new AssignmentUtils(doc.assignments).canonicalForDate(schedDate);
      return entry ? [entry] : [];
    });
    return Array.from(new Set(canonical.map((a) => a.employeeId))).sort();
  });

// Canonical servIds for a specific date — for loadout page to trigger customer data fetch
const selectServIdsForDate = (schedDate: string) =>
  createSelector([selectDocs], (docs) => {
    return docs
      .filter((doc) => new AssignmentUtils(doc.assignments).canonicalForDate(schedDate) !== null)
      .map((doc) => doc.servId);
  });

// Canonical servIds for a specific employee on a specific date — for feedbackSelect
const selectServIdsByEmployeeAndSchedDate = (employeeId: string, schedDate: string) =>
  createSelector([selectDocs], (docs) => {
    return docs
      .filter((doc) => {
        const canonical = new AssignmentUtils(doc.assignments).canonicalForDate(schedDate);
        return canonical?.employeeId === employeeId;
      })
      .map((doc) => doc.servId);
  });

// Canonical assignments within a date range, grouped by employeeId
// Used by productivity/reliability — one canonical entry per (servId, schedDate) pair
const selectAssignmentsByEmployeeForRange = (dateRange: TRange<string>) =>
  createSelector([selectDocs], (docs) => {
    const canonical = docs.flatMap((doc) => {
      const utils = new AssignmentUtils(doc.assignments);
      return utils.canonical.filter(
        (a) => a.schedDate >= dateRange.min && a.schedDate <= dateRange.max,
      );
    });
    return new Grouper(canonical).groupBy((a) => a.employeeId).toMap();
  });

export const assignmentSelect = {
  docs: selectDocs,
  availableDates: selectAvailableDates,
  byServId: selectByServId,
  loadedServIds: selectLoadedServIds,
  utilsForServId: selectUtilsForServId,
  techsForDate: selectTechsForDate,
  servIdsForDate: selectServIdsForDate,
  servIdsByEmployeeAndSchedDate: selectServIdsByEmployeeAndSchedDate,
  assignmentsByEmployeeForRange: selectAssignmentsByEmployeeForRange,
};
