import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's zip codes (the city, alternate cities and tax codes of each zip), read live from
// RealGreen and joined with the stored extras (`extendZipCodes`).
//
// zipCodes.realGreen.read -> realGreen/zipCode getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's zip codes. There is
// no screen of its own. The customer value by zip screen and the quick send preview load them.
export const zipCodeCapabilities = createFeatureCapabilities({
  key: "zipCode",
  resources: {
    zipCodes: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
