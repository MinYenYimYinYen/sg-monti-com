import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Services a manager has flagged for priority scheduling: one stored note and date (or date range)
// per RealGreen service. The pace Priorities tab reads them too, but the flags and their routes
// are owned here.
//
// priorityServices.read   -> priorityService getAll
// priorityServices.write  -> priorityService upsert
// priorityServices.delete -> priorityService deleteOne
//
// delete was admin and office like the other two ops, but it removes the flag outright, so it
// stays its own verb and can be assigned apart from write.
export const priorityServiceCapabilities = createFeatureCapabilities({
  key: "priorityService",
  resources: {
    priorityServices: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
