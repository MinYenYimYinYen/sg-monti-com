import { defineGroup } from "@/permission/defineGroup";

export const siteAdminGroup = defineGroup({
  key: "siteAdmin",
  name: "Site Admin",
  description: "Auth/Permissions/Global Settings",
  resources: {
    // The current season, cover sheet flags, renewal flag ids, phone map and price increase flag
    // mappings. Nearly every screen loads it for the season: without `read` they see none.
    globalSettings: { name: "Global settings", verbs: ["read", "write"] },
    // `write` approves a user, which sets a role, and roles still gate every route that has not
    // migrated, so it can make someone an admin until roles are removed. Assign it deliberately.
    accessRequests: { name: "Access requests and password resets", verbs: ["read", "write"] },
    // Editing bundles is gated by 'superUser', which cannot be granted, so there is only `read`.
    bundles: { name: "Capability bundles", verbs: ["read"] },
    userCapabilities: { name: "User capabilities", verbs: ["read", "write"] },

    // Manual syncs of the RealGreen mirror. The scheduled sync is a cron job, so running one by
    // hand is its own permission, separate from access to the data it copies.
    syncStatus: { name: "Sync status", verbs: ["read"] },
    lastSyncTimes: { name: "Last sync times", verbs: ["read"] },
    corruptedSyncRecords: { name: "Corrupted sync records", verbs: ["read"] },
    deltaSync: { name: "Run delta sync", verbs: ["write"] },
    // IRREVERSIBLE: wipes the group's mirror collections, then reloads them from RealGreen one
    // step at a time. Also covers resuming a stopped run. The password check on the server is not
    // a capability: it re-authenticates the person.
    fullSync: { name: "Run full sync", verbs: ["write"] },
    // Clearing a lock can free one whose sync is still running, and a second sync can then start
    // over it. With abandonRun it also discards an unfinished full sync.
    syncLocks: { name: "Clear sync locks", verbs: ["write"] },
    // The legacy per-entity triggers. They write into the mirror and take no sync lock, so a run
    // can overlap the cron job. Customers, programs and services sync together: syncing some and
    // not the others leaves a broken mirror.
    customerSync: { name: "Customer, program and service sync", verbs: ["write"] },
    callLogSync: { name: "Call log sync", verbs: ["write"] },
  },
});
