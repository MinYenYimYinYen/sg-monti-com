import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's discount codes (percent or flat amounts applied to a customer, program or service),
// read live from RealGreen and joined with the stored discount properties kept here.
//
// discounts.realGreen.read -> realGreen/discount getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's discounts. There is
// no screen of its own. The discounts hydrate the customer, program and service entities (their
// price after discount), and the pace and prepay letter screens load them for that.
export const discountCapabilities = createFeatureCapabilities({
  key: "discount",
  resources: {
    discounts: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
