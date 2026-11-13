import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen call logs: the live read of one customer's logs, and the legacy trigger that copies
// call logs from RealGreen into the MongoDB mirror.
//
// callLogs.realGreen.read   -> callLog getCallLogsForCustomer (live from RealGreen, nothing stored)
// callLogSync.write         -> callLog/sync syncCallLogs
//
// The sync trigger is its own singleton resource, not a verb on the call logs, so a read-only
// bundle can never pick it up. It writes into the mirror (a forced run reloads every record and
// replaces each record's notes) and spends RealGreen API calls, and it was admin only before. It
// takes no sync lock, so a run can overlap the cron job (see the sync note in callLog.readme.md).
// The Sync Utilities page is the supported way to sync and is a separate folder.
//
// The mirror itself (the `CallLog` collection) is read through the customer module, which hydrates
// `callLogs` onto each customer, so the customer reads gate it, not this feature. `read` here
// covers only the live single-customer fetch, which has no screen apart from the sandbox page.
export const callLogCapabilities = createFeatureCapabilities({
  key: "callLog",
  resources: {
    callLogs: { shape: "collection", source: "realGreen", verbs: ["read"] },
    callLogSync: { shape: "singleton", verbs: ["write"] },
  },
});
