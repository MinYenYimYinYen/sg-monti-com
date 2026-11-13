import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's company records (name, address, phones, reply email), read live from RealGreen.
// Nothing is stored here.
//
// companies.realGreen.read -> realGreen/company getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's companies. The
// company list page is its own screen. The prepay letters also read the company (it fills the
// letter's return address), so they list this read in their own `requires` (deferred, see the
// record).
export const companyCapabilities = createFeatureCapabilities({
  key: "company",
  resources: {
    companies: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
