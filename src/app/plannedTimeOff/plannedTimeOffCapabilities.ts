import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Employee absences: planned time off and unplanned absences share one stored list (requestType
// tells them apart), so they share one resource.
//
// absences.read   -> plannedTimeOff getAll
// absences.write  -> plannedTimeOff upsert (planned time off and unplanned absences)
// absences.delete -> plannedTimeOff deleteOne
//
// delete was admin and office like the other two ops, but it removes a record outright, so it stays
// its own verb and can be assigned apart from write.
export const plannedTimeOffCapabilities = createFeatureCapabilities({
  key: "plannedTimeOff",
  resources: {
    absences: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
