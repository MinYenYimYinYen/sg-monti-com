import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Which tech is assigned to which service on which date. The history is append-only: saving never
// edits or removes an earlier entry, so there is no delete.
//
// serviceAssignments.read   -> assignment getByServIds, getBySchedDate, getAvailableDates,
//                              getBySchedDateRange
// serviceAssignments.write  -> assignment saveAssignments (the unserviced report upload)
//
// legacyAssignmentMigration.write -> assignment/migrate migrateAssignments. A one-time copy of the
//   old embedded assignments into the standalone collection. It overwrites each service's stored
//   assignments, so it has its own capability and is never part of a bundle. Delete this resource
//   with the migrate route once the migration has been run.
export const assignmentCapabilities = createFeatureCapabilities({
  key: "assignment",
  resources: {
    serviceAssignments: { shape: "collection", verbs: ["read", "write"] },
    legacyAssignmentMigration: { shape: "singleton", verbs: ["write"] },
  },
});
