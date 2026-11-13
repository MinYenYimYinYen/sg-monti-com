import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { quickbooksCapabilities } from "@/app/qbo/quickbooksCapabilities";

// Credit card import: a CSV is imported as rows, each row is mapped to a vendor and an expense
// account, and the mapped rows are posted to QuickBooks as expenses.
//
// expensePostings.qbo.write -> post postRows, reconcileRow
//   postRows creates real expenses in the live books, and this app cannot undo or edit them
//   afterwards. It has its own capability and is never part of a read-only bundle. reconcileRow
//   never posts, but it settles a row that was left unknown (found in QuickBooks, or returned to
//   pending so it can be retried), so it sits with the poster rather than with a read. Admin
//   only before the migration, so assign it deliberately.
// expensePostings.qbo.read  -> post previewPost, previewBatch (ask QuickBooks what a post would
//                              do and send nothing)
//
// formatAccounts.read  -> mapping getFormatAccounts
// formatAccounts.write -> mapping upsertFormatAccount. Chooses which QuickBooks card account each
//                         bank's rows post to. Admin only before the migration, so it is its own
//                         resource and can be assigned apart from the other mappings.
//
// cardAssignments.read  -> mapping getCardAssignments, getAssignableUsers (staff names, for the
//                          responsible-user picker)
// cardAssignments.write -> mapping upsertCardAssignment
//
// merchantMappings.read   -> mapping getMerchantMappings
// merchantMappings.write  -> mapping upsertMerchantMapping, confirmMerchant
// merchantMappings.delete -> mapping deleteMerchantMapping
//
// skipRules.read   -> mapping getSkipRules
// skipRules.write  -> mapping upsertSkipRule
// skipRules.delete -> mapping deleteSkipRule
//
// importRows.read  -> rows getOpenRows
// importRows.write -> rows previewImport, commitImport, setRowSkip, setRowAccount. previewImport
//                     writes nothing but only makes sense as the first step of an import.
//
// mapDecisions.write -> decisions saveDecisions. The Map tab saves merchant mappings, row
//   accounts, row skips and skip rules in one request. It has its own verb so that holding
//   `merchantMappings.write` alone never lets someone skip rows or add skip rules through it.
//
// requires: the module opens on `importRows.read`, and its layout also loads every mapping list
// and the QuickBooks reference lists, so reading it needs those reads. Its own entries are written
// as strings because the constants are not available inside their own declaration (the same as
// `pace`).
const { can: quickbooksCan } = quickbooksCapabilities;

export const importCCTxnCapabilities = createFeatureCapabilities({
  key: "importCCTxn",
  resources: {
    importRows: { shape: "collection", verbs: ["read", "write"] },
    formatAccounts: { shape: "collection", verbs: ["read", "write"] },
    cardAssignments: { shape: "collection", verbs: ["read", "write"] },
    merchantMappings: { shape: "collection", verbs: ["read", "write", "delete"] },
    skipRules: { shape: "collection", verbs: ["read", "write", "delete"] },
    mapDecisions: { shape: "singleton", verbs: ["write"] },
    expensePostings: { shape: "singleton", source: "qbo", verbs: ["read", "write"] },
  },
  requires: {
    "importRows.read": [
      "importCCTxn.formatAccounts.read",
      "importCCTxn.cardAssignments.read",
      "importCCTxn.merchantMappings.read",
      "importCCTxn.skipRules.read",
      quickbooksCan.accounts.read,
      quickbooksCan.vendors.read,
      quickbooksCan.customers.read,
      quickbooksCan.employees.read,
    ],
    "formatAccounts.write": [quickbooksCan.accounts.read],
    "mapDecisions.write": [
      "importCCTxn.importRows.read",
      "importCCTxn.merchantMappings.read",
      "importCCTxn.skipRules.read",
    ],
    "expensePostings.read": ["importCCTxn.importRows.read"],
    "expensePostings.write": [
      "importCCTxn.expensePostings.qbo.read",
      "importCCTxn.importRows.read",
      "importCCTxn.merchantMappings.read",
    ],
  },
});
