import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { conditionCodeCapabilities } from "@/app/realGreen/conditionCode/conditionCodeCapabilities";

// The conditions RealGreen has recorded against individual services (for example "wet lawn" on one
// visit), read live from RealGreen by service id. Nothing is stored here.
//
// serviceConditions.realGreen.read -> realGreen/serviceCondition getServiceConditions
//
// Read only: the contract has no write, and this app never changes a service's conditions.
// There is no screen of its own. The cover sheets load these to print a service's conditions.
//
// requires: each service condition only carries a condition id. The text shown comes from the
// condition code list (`conditionCode`), so reading them for display needs that read too. The
// service ids come from the customer mirror, which the cover sheets list in their own `requires`
// (deferred, see the record).
export const serviceConditionCapabilities = createFeatureCapabilities({
  key: "serviceCondition",
  resources: {
    serviceConditions: {
      shape: "collection",
      source: "realGreen",
      verbs: ["read"],
    },
  },
  requires: {
    "serviceConditions.read": [conditionCodeCapabilities.can.conditionCodes.read],
  },
});
