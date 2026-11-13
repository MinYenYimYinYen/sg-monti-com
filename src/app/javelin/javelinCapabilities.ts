import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Javelin turns uploaded General Ledger and deposit files, and typed-in check deposits, into
// QuickBooks journal entries. The previews build each entry from the stored account links and
// compare it with what was already posted. Nothing is stored by the previews.
//
// entryPlans.read -> javelin previewGenLedger, previewDeposits, previewCkDeposits, getLatest
//
// journalEntryPostings.qbo.write -> javelin postGenLedger, postDeposits, postCkDeposits
//   Creates real journal entries in the live books, and this app cannot undo or edit them
//   afterwards. It has its own capability and is never part of a read-only bundle. It is one
//   capability for all three kinds (General Ledger, credit card deposits, check deposits) because
//   they post through the same server path. Split it per kind if the kinds need to be assigned
//   apart. Admin only before the migration, so assign it deliberately.
//
// requires: posting only works from a plan, and a plan comes from a preview, so `write` needs the
// preview read. The previews read the account links and the QuickBooks accounts on the server, not
// through the user's own capabilities, so those reads are not listed. The Settings tab is the
// account mapping page, which is gated by the `account` feature's own capabilities.
export const javelinCapabilities = createFeatureCapabilities({
  key: "javelin",
  resources: {
    entryPlans: { shape: "collection", verbs: ["read"] },
    journalEntryPostings: { shape: "singleton", source: "qbo", verbs: ["write"] },
  },
  requires: {
    "journalEntryPostings.write": ["javelin.entryPlans.read"],
  },
});
