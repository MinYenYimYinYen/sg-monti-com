import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Posting journal entries to QuickBooks, and the stored record of what was posted.
//
// journalEntryPostings.qbo.write -> postMany, reconcile
//   postMany creates real journal entries in the live books, and this app cannot undo or edit them
//   afterwards. It has its own capability and is never part of a read-only bundle. reconcile never
//   posts, but it settles entries left unknown or unverified (found in QuickBooks, or returned so
//   they can be retried), so it sits with the poster rather than with a read. Admin only before
//   the migration, so assign it deliberately.
//
// postingHistory.read -> getByDateRange (our own stored postings, no call to QuickBooks)
//
// `javelin.journalEntryPostings.qbo.write` is a different capability: Javelin builds and posts its
// own entries through the same server code, and its screens are gated by the `javelin` feature.
// Holding one does not grant the other.
export const qboJournalEntryCapabilities = createFeatureCapabilities({
  key: "qboJournalEntry",
  resources: {
    journalEntryPostings: { shape: "singleton", source: "qbo", verbs: ["write"] },
    postingHistory: { shape: "collection", verbs: ["read"] },
  },
});
