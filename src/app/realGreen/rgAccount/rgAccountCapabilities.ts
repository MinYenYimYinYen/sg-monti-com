import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's general ledger accounts, read live from RealGreen (nothing is stored here).
//
// rgAccounts.realGreen.read -> realGreen/rgAccount getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's accounts. The
// account mapping screen lists these and links each to a QuickBooks account, so it lists this read
// in its `requires` (see accountCapabilities).
export const rgAccountCapabilities = createFeatureCapabilities({
  key: "rgAccount",
  resources: {
    rgAccounts: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
