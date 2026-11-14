import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Sync Utilities: the admin page that runs the RealGreen mirror sync by hand. All of it was admin
// only. The ops differ a lot in what they can break, so they do not share a capability.
//
// syncStatus.read  -> syncUtils getSyncStatus (lock state, counts and checkpoints)
// deltaSync.write  -> syncUtils runDeltaSync (fetches changes since the checkpoint and writes the mirror)
// fullSync.write   -> syncUtils startFullSync, runFullSyncChunk (IRREVERSIBLE: wipes the group's mirror
//                     collections, then reloads them from RealGreen one step at a time)
// syncLocks.write  -> syncUtils clearSyncLock (frees a lock; with abandonRun it also discards an
//                     unfinished full sync and leaves the mirror empty or partial until a delta sync
//                     reloads it)
//
// startFullSync still asks for the user's password on the server. That check is not a capability:
// it re-authenticates the person, and it stays whoever holds `fullSync.write`.
//
// runFullSyncChunk shares `fullSync.write` with startFullSync: it is only meaningful after a run
// was started, and it is how a stopped run is resumed, so someone who may start one must also be
// able to finish it. `syncLocks.write` is separate because clearing a lock can free one whose sync
// is still running, and a second sync can then start over it.
export const syncUtilsCapabilities = createFeatureCapabilities({
  key: "syncUtils",
  resources: {
    syncStatus: { shape: "singleton", verbs: ["read"] },
    deltaSync: { shape: "singleton", verbs: ["write"] },
    fullSync: { shape: "singleton", verbs: ["write"] },
    syncLocks: { shape: "collection", verbs: ["write"] },
  },
});
