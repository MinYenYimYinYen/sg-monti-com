import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Purchases (expenses) read live from the QuickBooks books, by date range. Read only: the writes
// that create purchases are the credit card import's (`importCCTxn.expensePostings.qbo.write`),
// and the import reads purchases through server code, not through this route.
//
// purchases.qbo.read -> getByDateRange
export const qboPurchaseCapabilities = createFeatureCapabilities({
  key: "qboPurchase",
  resources: {
    purchases: { shape: "collection", source: "qbo", verbs: ["read"] },
  },
});
