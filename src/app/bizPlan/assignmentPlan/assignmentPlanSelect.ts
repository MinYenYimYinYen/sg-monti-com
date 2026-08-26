import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { AssignmentPlan } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

const selectAssignmentPlans = (state: AppState) =>
  state.assignmentPlan.assignmentPlans;

const selectScenarios = (state: AppState) => state.assignmentPlan.scenarios;

const selectScenarioMap = createSelector(
  [selectScenarios],
  (scenarios) => new Grouper(scenarios).toUniqueMap((s) => s.name),
);

// ---------------------------------------------------------------------------
// Derived groupIds selector — backward compat for all consumers that iterate
// plan.groupIds. Extracts the ordered groupId list from groupAssignments.
// ---------------------------------------------------------------------------

/**
 * Map of employeeId → AssignmentPlan — only employees with at least one groupAssignment.
 * Employees with empty plans are excluded so they don't appear in cards, the crawler, or
 * any downstream selector that iterates this map.
 */
const selectAssignmentsByEmployeeId = createSelector(
  [selectAssignmentPlans],
  (assignmentPlans) =>
    new Grouper(
      assignmentPlans.filter((ap) => ap.groupAssignments.length > 0),
    ).toUniqueMap((ap) => ap.employeeId),
);

// Inverted map: servCodeId → employeeId[] ordered by each employee's priority for that servCode.
// Built by iterating each employee's groupAssignments, resolving each groupId to its member servCodeIds
// via groupMap, and recording the employee's priority index for each servCode.
// Consumers (e.g. D2 team rate) receive employees in priority order for a given servCode.
const selectAssignmentsByServCodeId = createSelector(
  [selectAssignmentPlans, assignmentGroupSelect.groupMap],
  (assignmentPlans, groupMap) => {
    const map = new Map<string, { employeeId: string; priority: number }[]>();

    for (const plan of assignmentPlans) {
      plan.groupAssignments.forEach(({ groupId }, priority) => {
        const group = groupMap.get(groupId);
        // Fall back to parsing groupId as sorted servCodeIds joined with "+"
        const servCodeIds = group?.servCodeIds ?? groupId.split("+");
        for (const servCodeId of servCodeIds) {
          const existing = map.get(servCodeId) ?? [];
          existing.push({ employeeId: plan.employeeId, priority });
          map.set(servCodeId, existing);
        }
      });
    }

    // Sort each servCode's employee list by priority ascending
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
 * Map of employeeId → dailyRevenueGoal per groupId.
 * Used by the crawler to look up the goal rate for each employee × group pair.
 * Returns null when no goal has been set (crawler falls back to lookback avg).
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

export const assignmentPlanSelect = {
  assignmentPlans: selectAssignmentPlans,
  assignmentsByEmployeeId: selectAssignmentsByEmployeeId,
  assignmentsByServCodeId: selectAssignmentsByServCodeId,
  goalByEmployeeByGroup: selectGoalByEmployeeByGroup,
  scenarios: selectScenarios,
  scenarioMap: selectScenarioMap,
};

// Re-export the Employee type for use in hydrateAssignedTo without circular imports
export type { Employee };
