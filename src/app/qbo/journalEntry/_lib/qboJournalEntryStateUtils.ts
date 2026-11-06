import { JournalEntryPosting } from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

// Pure helpers for the slice and selectors, so the merge and grouping rules can be tested.

/** The incoming postings replace held ones with the same DocNumber; new ones are added. Sorted by date, then DocNumber. */
export function mergePostings({
  held,
  incoming,
}: {
  held: JournalEntryPosting[];
  incoming: JournalEntryPosting[];
}): JournalEntryPosting[] {
  const byDocNumber = new Map(held.map((posting) => [posting.docNumber, posting]));
  for (const posting of incoming) byDocNumber.set(posting.docNumber, posting);
  return [...byDocNumber.values()].sort(
    (a, b) => a.txnDate.localeCompare(b.txnDate) || a.docNumber.localeCompare(b.docNumber),
  );
}

/** Postings that need a person: unknown or failed, posted but not yet verified, or stuck. */
export function pickPostingsNeedingAttention(postings: JournalEntryPosting[]): JournalEntryPosting[] {
  return postings.filter(
    (posting) =>
      posting.status === "unknown" ||
      posting.status === "failed" ||
      posting.status === "posting" ||
      (posting.status === "posted" && !posting.verifiedAt),
  );
}

export function countPostingsByStatus(
  postings: JournalEntryPosting[],
): Record<JournalEntryPosting["status"], number> {
  const counts: Record<JournalEntryPosting["status"], number> = {
    pending: 0,
    posting: 0,
    posted: 0,
    failed: 0,
    unknown: 0,
  };
  for (const posting of postings) counts[posting.status] += 1;
  return counts;
}
