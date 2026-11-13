import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { holidayCapabilities } from "@/app/holiday/holidayCapabilities";

// Employee absences: planned time off and unplanned absences share one stored list (requestType
// tells them apart), so they share one resource.
//
// absences.read   -> plannedTimeOff getAll
// absences.write  -> plannedTimeOff upsert (planned time off and unplanned absences)
// absences.delete -> plannedTimeOff deleteOne
//
// delete was admin and office like the other two ops, but it removes a record outright, so it stays
// its own verb and can be assigned apart from write.
//
// requires: the calendar draws holidays and weather days on the same grid, so reading it needs the
// holiday read. It also lists employees (RealGreen), which are not declared yet (deferred).
export const plannedTimeOffCapabilities = createFeatureCapabilities({
  key: "plannedTimeOff",
  resources: {
    absences: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  requires: {
    "absences.read": [holidayCapabilities.can.holidays.read],
  },
});
