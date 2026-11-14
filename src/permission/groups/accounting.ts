import { defineGroup } from "@/permission/defineGroup";

// The live QuickBooks books, and what this app stores about and sends to them. The QuickBooks
// resources are a secondary view of QBO data, so each carries the qbo prefix. Anything sent to live
// QuickBooks is stored here too, and its preview (the plan) is a separate resource from the post.
export const accountingGroup = defineGroup({
  key: "accounting",
  name: "Accounting",
  description: "Quickbooks transactions and reporting",
  resources: {
    qboAccounts: { name: "QuickBooks accounts", source: "qbo", verbs: ["read"] },
    qboCustomers: { name: "QuickBooks customers", source: "qbo", verbs: ["read"] },
    qboEmployees: { name: "QuickBooks employees", source: "qbo", verbs: ["read"] },
    // `write` creates a real vendor in the live books, and this app cannot rename or delete it
    // afterwards. Assign it deliberately and never fold it into a read-only bundle.
    qboVendors: { name: "QuickBooks vendors", source: "qbo", verbs: ["read", "write"] },
    qboPurchases: { name: "QuickBooks purchases", source: "qbo", verbs: ["read"] },
    // `write` only begins the OAuth round trip, but the callback then replaces the stored
    // connection, so it changes which company every QuickBooks screen talks to.
    qboConnection: { name: "QuickBooks connection", verbs: ["read", "write"] },
    // Revokes the app's access at Intuit and deletes the stored tokens, which stops every
    // QuickBooks screen until someone connects again. Never part of a read-only bundle.
    qboConnectionRevocation: { name: "Disconnect QuickBooks", verbs: ["write"] },

    accountMappings: { name: "Account mappings", verbs: ["read", "write", "delete"] },
    depositFieldLinks: { name: "Deposit account links", verbs: ["read", "write", "delete"] },

    // Creates real journal entries in the live books, and this app cannot undo or edit them
    // afterwards. One capability for every screen that posts them (General Ledger, credit card
    // deposits, check deposits), because they post through the same server path. `write` also
    // covers reconciling an entry left unknown. Never part of a read-only bundle.
    qboJournalEntries: {
      name: "Post journal entries to QuickBooks",
      source: "qbo",
      verbs: ["write"],
    },
    // The previews built from uploaded files. Nothing is stored by them.
    journalEntryPlans: { name: "Journal entry plans", verbs: ["read"] },
    // Our own stored record of what was posted, with no call to QuickBooks.
    journalEntryHistory: { name: "Posted journal entry history", verbs: ["read"] },

    ccImportRows: { name: "Credit card import rows", verbs: ["read", "write"] },
    // Chooses which QuickBooks card account each bank's rows post to.
    ccFormatAccounts: { name: "Credit card format accounts", verbs: ["read", "write"] },
    ccCardAssignments: { name: "Credit card assignments", verbs: ["read", "write"] },
    ccMerchantMappings: {
      name: "Credit card merchant mappings",
      verbs: ["read", "write", "delete"],
    },
    ccSkipRules: { name: "Credit card skip rules", verbs: ["read", "write", "delete"] },
    // The Map tab saves merchant mappings, row accounts, row skips and skip rules in one request.
    // It has its own verb so holding `ccMerchantMappings.write` alone never lets someone skip rows
    // or add skip rules through it.
    ccMapDecisions: { name: "Credit card map decisions", verbs: ["write"] },
    // Asks QuickBooks what a post would do and sends nothing.
    ccExpensePlans: { name: "Credit card expense plans", source: "qbo", verbs: ["read"] },
    // Creates real expenses in the live books, and this app cannot undo or edit them afterwards.
    // `write` also covers reconciling a row left unknown. Never part of a read-only bundle.
    qboExpensePostings: {
      name: "Post expenses to QuickBooks",
      source: "qbo",
      verbs: ["write"],
    },

    // A check can only be replaced by saving again on the same date, which is the normal edit.
    inventoryChecks: { name: "Monthly inventory checks", verbs: ["read", "write"] },
    punches: { name: "Time card punches", verbs: ["read", "write"] },
    increasePlans: { name: "Price increase plans", verbs: ["read", "write", "delete"] },
    increaseSettings: { name: "Price increase settings", verbs: ["read", "write", "delete"] },
  },
});
