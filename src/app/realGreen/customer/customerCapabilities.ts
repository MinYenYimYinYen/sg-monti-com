import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen customers, with their programs and services. Almost every screen reads them.
//
// customers.realGreen.read -> customer/mirror getMirrorCustomers
//   The synced copy in MongoDB (the "mirror"). Customer, program and service data all come through
//   this one op, and every context on the mirror pipeline loads through it (see PIPELINE in
//   customerSlices). It is the read most screens need.
//
// liveCustomers.realGreen.read -> customer refreshCustomer, runSearchScheme
//   Live calls to RealGreen. They spend RealGreen API calls (a full scheme run takes about 38
//   seconds), so they are not part of `customers.read`. refreshCustomer is how a screen re-reads
//   one customer after the CRM changed it. runSearchScheme is the old RealGreen pipeline, kept as
//   the rollback for any context that is flipped back from "mirror".
//
// customerSync.write -> customer/sync syncCustomers, customer/sync/programSync syncPrograms,
//   customer/sync/serviceSync syncServices
//   The legacy per-entity sync triggers. They write into the mirror (a forced run reloads every
//   record) and take no sync lock, so a run can overlap the cron job. They were admin only. The
//   Sync Utilities page (`syncUtils`) is the supported way to sync and is a separate folder.
//
// corruptedSyncRecords.read -> customer/sync/corruptedRecords getCorruptedSyncRecords
//   Our own stored log of records the sync skipped. Admin only before.
//
// Mirror-only screens (the sandbox corrupted records pages) need `corruptedSyncRecords.read` and
// `customers.read`. A screen that also refreshes single customers needs `liveCustomers.read`.
export const customerCapabilities = createFeatureCapabilities({
  key: "customer",
  resources: {
    customers: { shape: "collection", source: "realGreen", verbs: ["read"] },
    liveCustomers: {
      shape: "collection",
      source: "realGreen",
      verbs: ["read"],
    },
    customerSync: { shape: "singleton", verbs: ["write"] },
    corruptedSyncRecords: { shape: "collection", verbs: ["read"] },
  },
});
