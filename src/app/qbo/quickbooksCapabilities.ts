import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// QuickBooks reference data (read from the live books) and the one write this app makes to it.
// Reference data is shared by several screens, which is why each list has its own capability.
//
// accounts.read   -> qbo/account getAll
// customers.read  -> qbo/customer getAll
// employees.read  -> qbo/employee getAll
// vendors.read    -> qbo/vendor getAll
// vendors.write   -> qbo/vendor createVendor (creates a real vendor in the live books, and this
//                    app cannot rename or delete it afterwards. Admin only before the migration,
//                    so assign it deliberately and never fold it into a read-only bundle)
//
// Only the reference data is declared here. The rest of the qbo folder is a feature of its own:
// qboConnection, qboPurchase, qboJournalEntry and importCCTxn.
export const quickbooksCapabilities = createFeatureCapabilities({
  key: "quickbooks",
  resources: {
    accounts: { shape: "collection", source: "qbo", verbs: ["read"] },
    customers: { shape: "collection", source: "qbo", verbs: ["read"] },
    employees: { shape: "collection", source: "qbo", verbs: ["read"] },
    vendors: { shape: "collection", source: "qbo", verbs: ["read", "write"] },
  },
});
