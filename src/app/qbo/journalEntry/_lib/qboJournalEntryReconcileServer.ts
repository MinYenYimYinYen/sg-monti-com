import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  JournalEntryBlocked,
  JournalEntryPosting,
  JournalEntryPostResult,
  QboJournalEntry,
  ReconcileJournalEntriesResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { isSafeDocNumber } from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";
import {
  describeNotReconcilable,
  interpretReconcile,
  isReconcilable,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryReconcileUtils";
import { findJournalEntriesByDocNumber } from "@/app/qbo/journalEntry/_lib/qboJournalEntryLookupServer";
import {
  loadPostingsByDocNumber,
  recordDecision,
  recordNote,
  recordVerification,
  validationError,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";

// Server only. Reads QuickBooks and our own postings. It never creates an entry in QuickBooks.

function sortByDocNumber(found: QboJournalEntry[]): Map<string, QboJournalEntry[]> {
  const byDocNumber = new Map<string, QboJournalEntry[]>();
  for (const entry of found) {
    if (!entry.DocNumber) continue;
    byDocNumber.set(entry.DocNumber, [...(byDocNumber.get(entry.DocNumber) ?? []), entry]);
  }
  return byDocNumber;
}

function canLookUp({
  posting,
  nowMs,
}: {
  posting: JournalEntryPosting;
  nowMs: number;
}): boolean {
  return isReconcilable({
    status: posting.status,
    isVerified: Boolean(posting.verifiedAt),
    updatedAtMs: posting.updatedAt ? new Date(posting.updatedAt).getTime() : null,
    nowMs,
    stuckPostingMs: qboConst.journalEntryStuckPostingMs,
  });
}

/**
 * Settles one posting from what QuickBooks holds. A posted entry that cannot be confirmed is
 * never flipped to failed: it stays posted with a note, because a retry could enter it twice.
 */
async function settleOne({
  posting,
  found,
  postedByUserName,
}: {
  posting: JournalEntryPosting;
  found: QboJournalEntry[];
  postedByUserName: string;
}): Promise<JournalEntryPostResult> {
  const decision = interpretReconcile({ content: posting, found });

  if (posting.status === "posted") {
    if (decision.outcome === "posted" && decision.qboId) {
      const saved = await recordVerification({
        docNumber: posting.docNumber,
        qboId: decision.qboId,
        qboSyncToken: decision.qboSyncToken,
      });
      return { posting: saved, outcome: "posted" };
    }
    // Not found must not read as "safe to post again": QuickBooks said it posted this entry, so
    // it may have been deleted or changed there. A person has to look, and it is never retried.
    const message =
      found.length === 0
        ? "Not verified: QuickBooks has no journal entry with this DocNumber, although it was posted. It may have been deleted or renumbered in QuickBooks. Check there. Do not post it again."
        : `Not verified: ${decision.message}`;
    const saved = await recordNote({ docNumber: posting.docNumber, message });
    return { posting: saved, outcome: "posted" };
  }

  const saved = await recordDecision({
    docNumber: posting.docNumber,
    decision,
    postedByUserName,
  });
  return { posting: saved, outcome: decision.outcome };
}

/**
 * Looks the postings up in QuickBooks by DocNumber and settles each. An unknown or unverified
 * posting can always be looked up. One in "posting" only after it has been stuck for a while,
 * because a young one may still be on its way to QuickBooks in another request.
 */
export async function reconcileQboJournalEntries({
  docNumbers,
  postedByUserName,
}: {
  docNumbers: string[];
  postedByUserName: string;
}): Promise<ReconcileJournalEntriesResult> {
  const unique = [...new Set(docNumbers)];
  if (unique.length === 0) throw validationError("Choose at least one entry to reconcile.");
  if (unique.length > qboConst.journalEntryMaxPerRequest) {
    throw validationError(
      `At most ${qboConst.journalEntryMaxPerRequest} entries can be reconciled in one go.`,
    );
  }
  if (!unique.every(isSafeDocNumber)) throw validationError("A DocNumber is not valid.");

  const postings = await loadPostingsByDocNumber(unique);
  const nowMs = Date.now();
  const skipped: JournalEntryBlocked[] = [];
  const lookable: JournalEntryPosting[] = [];
  for (const docNumber of unique) {
    const posting = postings.get(docNumber);
    if (!posting) {
      skipped.push({ docNumber, problems: ["No stored entry has this DocNumber."] });
    } else if (!canLookUp({ posting, nowMs })) {
      skipped.push({ docNumber, problems: [describeNotReconcilable(posting.status)] });
    } else {
      lookable.push(posting);
    }
  }
  if (lookable.length === 0) return { results: [], skipped };

  const foundByDocNumber = sortByDocNumber(
    await findJournalEntriesByDocNumber(lookable.map((posting) => posting.docNumber)),
  );
  const results: JournalEntryPostResult[] = [];
  for (const posting of lookable) {
    results.push(
      await settleOne({
        posting,
        found: foundByDocNumber.get(posting.docNumber) ?? [],
        postedByUserName,
      }),
    );
  }
  return { results, skipped };
}
