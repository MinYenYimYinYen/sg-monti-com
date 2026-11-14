import { defineGroup } from "@/permission/defineGroup";

// Routing. The pace screens, priority scheduling, the time off calendar and the cover sheets are
// all built from these resources, and none of them is a resource of its own.
export const schedulingGroup = defineGroup({
  key: "scheduling",
  name: "Scheduling",
  description: "Features related to routing",
  resources: {
    // The history is append-only: saving never edits or removes an earlier entry, so no delete.
    serviceAssignments: { name: "Service assignments", verbs: ["read", "write"] },
    // Temporary: a one-time copy of the old embedded assignments into the standalone collection.
    // It overwrites each service's stored assignments. Never part of a bundle. Delete this
    // resource with the migrate route once the migration has been run.
    legacyAssignmentMigration: { name: "Legacy assignment migration", verbs: ["write"] },
    assignmentGroups: { name: "Assignment groups", verbs: ["read", "write", "delete"] },
    // Activating a scenario or season plan changes the pace numbers for everyone, but it only
    // flips which stored plan is active and can be flipped back, so it stays under `write`.
    assignmentScenarios: { name: "Assignment scenarios", verbs: ["read", "write", "delete"] },
    groupSequences: { name: "Group sequences", verbs: ["read", "write", "delete"] },
    seasonPlans: { name: "Season plans", verbs: ["read", "write", "delete"] },
    // Removing a constraint restores full availability, which changes the pace numbers.
    availabilityConstraints: {
      name: "Employee availability",
      verbs: ["read", "write", "delete"],
    },
    holidays: { name: "Holidays and weather days", verbs: ["read", "write", "delete"] },
    // Planned time off and unplanned absences share one stored list.
    employeeAbsences: { name: "Employee absences", verbs: ["read", "write", "delete"] },
    priorityServices: { name: "Priority services", verbs: ["read", "write", "delete"] },
    routeNotes: { name: "Route notes", verbs: ["read", "write", "delete"] },
    // Start and finish loadout both go through one op that replaces the stored document whole,
    // including a finished one, with no check. No delete: a loadout is only replaced.
    loadouts: { name: "Daily loadouts", verbs: ["read", "write"] },
    serviceEtas: { name: "Service ETAs", verbs: ["read", "write"] },
  },
});
