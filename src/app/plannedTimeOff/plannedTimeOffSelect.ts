import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

const selectDocs = (state: AppState) => state.plannedTimeOff.docs;

const selectAll = createSelector([selectDocs], (docs): PlannedTimeOff[] => docs);

const selectByEmployeeId = createSelector(
  [selectDocs],
  (docs): Map<string, PlannedTimeOff[]> =>
    new Grouper(docs).groupBy((d) => d.employeeId).toMap(),
);

export const plannedTimeOffSelect = {
  all: selectAll,
  byEmployeeId: selectByEmployeeId,
};
