import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectMainDate = (state: AppState) => state.pace.mainDate;
const selectGoalMultiplier = (state: AppState) => state.pace.goalMultiplier;
const selectGoalMultiplierGroupIds = (state: AppState) => state.pace.goalMultiplierGroupIds;
const selectQueuedByDateAndEmployee = (state: AppState) => state.pace.queuedByDateAndEmployee;
const selectQueuedPriceByDateAndEmployee = (state: AppState) => state.pace.queuedPriceByDateAndEmployee;
const selectSetupSelectedGroupId = (state: AppState) => state.pace.setupSelectedGroupId;
const selectAssignmentEditorSelectedEmployeeIds = (state: AppState) =>
  state.pace.assignmentEditorSelectedEmployeeIds;
const selectSetupSelectedGroupsByEmployee = (state: AppState) =>
  state.pace.setupSelectedGroupsByEmployee;

/**
 * Set of employeeIds currently selected in the SetupEmployeesPage left panel.
 * Derived from the stored string[] for O(1) membership checks.
 */
const selectAssignmentEditorSelectedEmployeeSet = createSelector(
  [selectAssignmentEditorSelectedEmployeeIds],
  (ids): Set<string> => new Set(ids),
);

/**
 * Map<employeeId, Set<groupId>> for the SetupEmployeesPage assignment card selections.
 * Derived from the stored Record<string, string[]> for O(1) membership checks.
 */
const selectSetupSelectedGroupSetsByEmployee = createSelector(
  [selectSetupSelectedGroupsByEmployee],
  (byEmployee): Map<string, Set<string>> => {
    const result = new Map<string, Set<string>>();
    for (const [employeeId, groupIds] of Object.entries(byEmployee)) {
      result.set(employeeId, new Set(groupIds));
    }
    return result;
  },
);

export const paceSelect = {
  mainDate: selectMainDate,
  goalMultiplier: selectGoalMultiplier,
  goalMultiplierGroupIds: selectGoalMultiplierGroupIds,
  queuedByDateAndEmployee: selectQueuedByDateAndEmployee,
  queuedPriceByDateAndEmployee: selectQueuedPriceByDateAndEmployee,
  setupSelectedGroupId: selectSetupSelectedGroupId,
  assignmentEditorSelectedEmployeeIds: selectAssignmentEditorSelectedEmployeeIds,
  assignmentEditorSelectedEmployeeSet: selectAssignmentEditorSelectedEmployeeSet,
  setupSelectedGroupsByEmployee: selectSetupSelectedGroupsByEmployee,
  setupSelectedGroupSetsByEmployee: selectSetupSelectedGroupSetsByEmployee,
};
