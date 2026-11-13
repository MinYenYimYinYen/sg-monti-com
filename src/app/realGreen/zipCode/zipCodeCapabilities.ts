import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { taxCodeCapabilities } from "@/app/realGreen/taxCode/taxCodeCapabilities";

// RealGreen's zip codes (the city, alternate cities and tax codes of each zip), read live from
// RealGreen and joined with the stored extras (`extendZipCodes`).
//
// zipCodes.realGreen.read -> realGreen/zipCode getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's zip codes. There is
// no screen of its own. The customer value by zip screen and the quick send preview load them.
//
// requires: a zip code only carries tax code ids. The tax rate shown comes from the tax code list
// (`zipCodeSelect` joins them), so reading zip codes for display needs that read too.
export const zipCodeCapabilities = createFeatureCapabilities({
  key: "zipCode",
  resources: {
    zipCodes: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
  requires: {
    "zipCodes.read": [taxCodeCapabilities.can.taxCodes.read],
  },
});
