import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";

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
//
// requires: the page builds its customer lookup from the current season, so reading it needs the
// global settings read. It also loads RealGreen programs, customers and services, which are not
// declared yet (deferred).
export const priorityServiceCapabilities = createFeatureCapabilities({
  key: "priorityService",
  resources: {
    priorityServices: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  requires: {
    "priorityServices.read": [globalSettingsCapabilities.can.settings.read],
  },
});
