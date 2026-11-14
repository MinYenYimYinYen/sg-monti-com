import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's condition codes (the reasons a service is conditional, such as a wet lawn), read live
// from RealGreen and joined with the upsell program codes stored here.
//
// conditionCodes.realGreen.read -> realGreen/conditionCode getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's condition codes.
// There is no screen of its own. The cover sheets load the codes to explain a service's condition
// (through `serviceCondition`).
export const conditionCodeCapabilities = createFeatureCapabilities({
  key: "conditionCode",
  resources: {
    conditionCodes: {
      shape: "collection",
      source: "realGreen",
      verbs: ["read"],
    },
  },
});
