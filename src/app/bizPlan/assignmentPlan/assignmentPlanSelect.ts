import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { flattenEntries } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";

const selectAssignmentPlans = (state: AppState) =>
  state.assignmentPlan.assignmentPlans;

const selectScenarios = (state: AppState) => state.assignmentPlan.scenarios;

const selectScenarioMap = createSelector(
  [selectScenarios],
  (scenarios) => new Grouper(scenarios).toUniqueMap((s) => s.name),
);

// Map of employeeId → AssignmentPlan (direct lookup for employee detail view)
const selectAssignmentsByEmployeeId = createSelector(
  [selectAssignmentPlans],
  (assignmentPlans) =>
    new Grouper(assignmentPlans).toUniqueMap((ap) => ap.employeeId),
);

// Inverted map: servCodeId → Employee[] ordered by each employee's priority for that servCode.
// Built by iterating each employee's entries and recording their position (priority index).
// Consumers (e.g. hydrateAssignedTo) receive employees in priority order for a given servCode.
const selectAssignmentsByServCodeId = createSelector(
  [selectAssignmentPlans],
  (assignmentPlans) => {
    const map = new Map<string, { employeeId: string; priority: number }[]>();

    for (const plan of assignmentPlans) {
      // Flatten entries to get all servCodeIds in priority order
      const allServCodeIds = flattenEntries(plan.entries);
      allServCodeIds.forEach((servCodeId, priority) => {
        const existing = map.get(servCodeId) ?? [];
        existing.push({ employeeId: plan.employeeId, priority });
        map.set(servCodeId, existing);
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

export const assignmentPlanSelect = {
  assignmentPlans: selectAssignmentPlans,
  assignmentsByEmployeeId: selectAssignmentsByEmployeeId,
  assignmentsByServCodeId: selectAssignmentsByServCodeId,
  scenarios: selectScenarios,
  scenarioMap: selectScenarioMap,
};

// Re-export the Employee type for use in hydrateAssignedTo without circular imports
export type { Employee };
