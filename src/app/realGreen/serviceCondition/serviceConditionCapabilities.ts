import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// The conditions RealGreen has recorded against individual services (for example "wet lawn" on one
// visit), read live from RealGreen by service id. Nothing is stored here.
//
// serviceConditions.realGreen.read -> realGreen/serviceCondition getServiceConditions
//
// Read only: the contract has no write, and this app never changes a service's conditions.
// There is no screen of its own. The cover sheets load these to print a service's conditions.
export const serviceConditionCapabilities = createFeatureCapabilities({
  key: "serviceCondition",
  resources: {
    serviceConditions: {
      shape: "collection",
      source: "realGreen",
      verbs: ["read"],
    },
  },
});
