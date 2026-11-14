import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's tax codes, read live from RealGreen and joined with the stored extras
// (`extendTaxCodes`).
//
// taxCodes.realGreen.read -> realGreen/taxCode getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's tax codes. There is
// no screen of its own. The prepay letters and the zip code list load the codes to work out tax
// (the zip code list reads them through `useZipCode`).
export const taxCodeCapabilities = createFeatureCapabilities({
  key: "taxCode",
  resources: {
    taxCodes: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
