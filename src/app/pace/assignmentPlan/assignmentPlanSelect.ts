import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AssignmentPlan } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

const selectAssignmentPlans = (state: AppState): AssignmentPlan[] =>
  state.paceAssignmentPlan.assignmentPlans;

const selectScenarios = (state: AppState) => state.paceAssignmentPlan.scenarios;

// Read raw docs directly from state to avoid circular dependency with assignmentGroupSelect.
// assignmentGroupSelect imports paceAssignmentPlanSelect, so we cannot import
// paceAssignmentGroupSelect here — use the raw doc state instead.
const selectAssignmentGroupDocs = (state: AppState): AssignmentGroupDoc[] =>
  state.paceAssignmentGroup.assignmentGroupDocs ?? [];

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
 * Built by resolving each groupId to its member servCodeIds via the raw AssignmentGroupDoc state.
 */
const selectAssignmentsByServCodeId = createSelector(
  [selectAssignmentPlans, selectAssignmentGroupDocs],
  (assignmentPlans, assignmentGroupDocs) => {
    const groupDocMap = new Map(assignmentGroupDocs.map((g) => [g.groupId, g]));
    const map = new Map<string, { employeeId: string; priority: number }[]>();

    for (const plan of assignmentPlans) {
      plan.groupAssignments.forEach(({ groupId }, priority) => {
        const groupDoc = groupDocMap.get(groupId);
        const servCodeIds = groupDoc?.servCodeIds ?? groupId.split("+");
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

export const paceAssignmentPlanSelect: {
  assignmentPlans: typeof selectAssignmentPlans;
  assignmentsByEmployeeId: typeof selectAssignmentsByEmployeeId;
  assignmentsByServCodeId: typeof selectAssignmentsByServCodeId;
  goalByEmployeeByGroup: typeof selectGoalByEmployeeByGroup;
  scenarios: typeof selectScenarios;
  scenarioMap: typeof selectScenarioMap;
  activeScenario: typeof selectActiveScenario;
} = {
  assignmentPlans: selectAssignmentPlans,
  assignmentsByEmployeeId: selectAssignmentsByEmployeeId,
  assignmentsByServCodeId: selectAssignmentsByServCodeId,
  goalByEmployeeByGroup: selectGoalByEmployeeByGroup,
  scenarios: selectScenarios,
  scenarioMap: selectScenarioMap,
  activeScenario: selectActiveScenario,
};
