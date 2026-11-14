import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's customer flags (the flag definitions a customer can carry), read live from RealGreen
// and joined with the stored flag properties kept here. Which customers carry a flag is a
// different feature (`custFlag`).
//
// flags.realGreen.read -> realGreen/flag getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's flag definitions
// (assigning a flag to a customer is `custFlag.flagAssignments`). The flag list page shows the
// flags, and many other screens load them to show a flag's description instead of its id (the nav
// bar filter, cover sheets, prepay letters, price increase, sanity, global settings).
export const flagCapabilities = createFeatureCapabilities({
  key: "flag",
  resources: {
    flags: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
