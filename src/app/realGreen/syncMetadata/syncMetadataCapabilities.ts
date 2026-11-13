import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// When each mirrored RealGreen entity type (customer, program, service, call log) last synced, and
// how many records that sync moved. Stored here, one document per entity type.
//
// syncMetadata.lastSyncTimes.read -> realGreen/syncMetadata getAll
//
// Read only: the sync code writes these documents on the server as a side effect of a sync, never
// on behalf of a user, so there is no write capability to hand out. The route was admin only and
// nothing calls it (it was written for a future sync status page). The `syncUtils` route reads the
// same documents through its own handler and will declare its own capabilities when that folder
// migrates.
export const syncMetadataCapabilities = createFeatureCapabilities({
  key: "syncMetadata",
  resources: {
    lastSyncTimes: { shape: "collection", verbs: ["read"] },
  },
});
