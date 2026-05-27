import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Scenario } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

const selectScenarios = (state: AppState) => state.assignmentPlan.scenarios;
const selectAssignmentPlans = (state: AppState) => state.assignmentPlan.assignmentPlans;

const selectActiveScenario = createSelector(
  [selectScenarios],
  (scenarios): Scenario | null => scenarios.find((s) => s.isActive) ?? null,
);

const selectInactiveScenarios = createSelector(
  [selectScenarios],
  (scenarios): Scenario[] => scenarios.filter((s) => !s.isActive),
);

/**
 * True when the current `assignmentPlans` in Redux differ from the active
 * scenario's saved `plans`. Drives the Save / Save As enabled state.
 */
const selectIsDirty = createSelector(
  [selectActiveScenario, selectAssignmentPlans],
  (activeScenario, assignmentPlans): boolean => {
    if (!activeScenario) return assignmentPlans.length > 0;
    return JSON.stringify(activeScenario.plans) !== JSON.stringify(assignmentPlans);
  },
);

export const scenarioCrudSelect = {
  activeScenario: selectActiveScenario,
  inactiveScenarios: selectInactiveScenarios,
  isDirty: selectIsDirty,
};
