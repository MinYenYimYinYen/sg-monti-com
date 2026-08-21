import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { Punch } from "@/app/timeCard/TimeCardTypes";

const selectCsvRows = (state: AppState) => state.timeCardImport.csvRows;
const selectSkippedPunchIds = (state: AppState) => state.timeCardImport.skippedPunchIds;
const selectImportStage = (state: AppState) => state.timeCardImport.importStage;
const selectSaveStatus = (state: AppState) => state.timeCardImport.saveStatus;

const selectAll = createSelector([selectCsvRows], (csvRows): Punch[] => csvRows);

const selectByEmployee = createSelector(
  [selectCsvRows],
  (csvRows): Map<string, Punch[]> =>
    new Grouper(csvRows).groupBy((punch) => punch.employeeId).toMap(),
);

const selectSkippedPunchIdsSet = createSelector(
  [selectSkippedPunchIds],
  (ids): Set<number> => new Set(ids),
);

const selectIsImportSheetOpen = (state: AppState) => state.timeCardImport.isImportSheetOpen;

export const timeCardImportSelect = {
  all: selectAll,
  byEmployee: selectByEmployee,
  skippedPunchIds: selectSkippedPunchIds,
  skippedPunchIdsSet: selectSkippedPunchIdsSet,
  importStage: selectImportStage,
  saveStatus: selectSaveStatus,
  isImportSheetOpen: selectIsImportSheetOpen,
};
