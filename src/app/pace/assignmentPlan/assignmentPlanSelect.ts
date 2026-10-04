import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AssignmentPlan } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";

const selectAssignmentPlans = (state: AppState): AssignmentPlan[] =>
  state.paceAssignmentPlan.assignmentPlans;

const selectScenarios = (state: AppState) => state.paceAssignmentPlan.scenarios;

const selectScenarioMap = createSelector(
  [selectScenarios],
  (scenarios) => new Grouper(scenarios).toUniqueMap((s) => s.name),
);

const selectActiveScenario = createSelector(
  [selectScenarios],
  (scenarios) => scenarios.find((s) => s.isActive) ?? null,
);

/**
 * Map of employeeId → AssignmentPlan — only employees with at least one groupAssignment.
 */
const selectAssignmentsByEmployeeId = createSelector(
  [selectAssignmentPlans],
  (assignmentPlans) =>
    new Grouper(
      assignmentPlans.filter((ap) => ap.groupAssignments.length > 0),
    ).toUniqueMap((ap) => ap.employeeId),
);

/**
 * Inverted map: servCodeId → employeeId[] ordered by each employee's priority for that servCode.
 * Built by resolving each groupId to its member servCodeIds via groupMap.
 */
const selectAssignmentsByServCodeId = createSelector(
  [selectAssignmentPlans, paceAssignmentGroupSelect.groupMap],
  (assignmentPlans, groupMap) => {
    const map = new Map<string, { employeeId: string; priority: number }[]>();

    for (const plan of assignmentPlans) {
      plan.groupAssignments.forEach(({ groupId }, priority) => {
        const group = groupMap.get(groupId);
        const servCodeIds = group?.servCodeIds ?? groupId.split("+");
        for (const servCodeId of servCodeIds) {
          const existing = map.get(servCodeId) ?? [];
          existing.push({ employeeId: plan.employeeId, priority });
          map.set(servCodeId, existing);
        }
      });
    }

    const sortedMap = new Map<string, string[]>();
    for (const [servCodeId, entries] of map) {
      const sorted = [...entries]
        .sort((a, b) => a.priority - b.priority)
        .map((e) => e.employeeId);
      sortedMap.set(servCodeId, sorted);
    }

    return sortedMap;
  },
);

/**
 * Map of employeeId → goalDailyPrice per groupId.
 * null when no goal has been set (engine will mark group as missing goals).
 */
const selectGoalByEmployeeByGroup = createSelector(
  [selectAssignmentPlans],
  (assignmentPlans): Map<string, Map<string, number | null>> => {
    const result = new Map<string, Map<string, number | null>>();
    for (const plan of assignmentPlans) {
      const byGroup = new Map<string, number | null>();
      for (const { groupId, dailyRevenueGoal } of plan.groupAssignments) {
        byGroup.set(groupId, dailyRevenueGoal);
      }
      result.set(plan.employeeId, byGroup);
    }
    return result;
  },
);

export const paceAssignmentPlanSelect = {
  assignmentPlans: selectAssignmentPlans,
  assignmentsByEmployeeId: selectAssignmentsByEmployeeId,
  assignmentsByServCodeId: selectAssignmentsByServCodeId,
  goalByEmployeeByGroup: selectGoalByEmployeeByGroup,
  scenarios: selectScenarios,
  scenarioMap: selectScenarioMap,
  activeScenario: selectActiveScenario,
};
