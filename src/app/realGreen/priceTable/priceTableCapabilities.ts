import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's price tables (the price a service costs by square footage or other range), read
// from RealGreen and cached in Mongo for a short time.
//
// priceTables.realGreen.read -> realGreen/priceTable getPriceTableDocs
//
// Read only: the contract has no write, and this app never changes RealGreen's price tables. The
// Mongo cache is refreshed by the read itself, so it is not a write the user chooses. There is no
// screen of its own. The price tables hydrate the program and service entities (what a service
// costs), and the prepay letter, price increase, quick send and business plan screens load them
// for that. Those screens list this read in their own `requires` (deferred, see the record).
export const priceTableCapabilities = createFeatureCapabilities({
  key: "priceTable",
  resources: {
    priceTables: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
