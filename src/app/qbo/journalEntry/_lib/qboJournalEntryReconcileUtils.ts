import {
  JournalEntryPostingContent,
  JournalEntryPostingStatus,
  QboJournalEntry,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { centsToDollars } from "@/app/qbo/journalEntry/_lib/qboJournalEntryUtils";
import {
  JournalEntryDecision,
  noEntryDecision,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryOutcomeUtils";

// Pure rules for settling a stored posting by reading QuickBooks.

function sumLineAmountCents(entry: QboJournalEntry): { debitCents: number; creditCents: number } {
  let debitCents = 0;
  let creditCents = 0;
  for (const line of entry.Line ?? []) {
    const cents = Math.round(line.Amount * 100);
    const postingType = line.JournalEntryLineDetail?.PostingType;
    if (postingType === "Debit") debitCents += cents;
    if (postingType === "Credit") creditCents += cents;
  }
  return { debitCents, creditCents };
}

/** Whether a journal entry in QuickBooks is the one we stored: same date, same line count, same total on both sides. */
export function matchesPosting({
  content,
  found,
}: {
  content: JournalEntryPostingContent;
  found: QboJournalEntry;
}): boolean {
  const { debitCents, creditCents } = sumLineAmountCents(found);
  return (
    found.TxnDate === content.txnDate &&
    (found.Line ?? []).length === content.lines.length &&
    debitCents === content.totalCents &&
    creditCents === content.totalCents
  );
}

/**
 * What a lookup of the posting's DocNumber says. Not found settles it as failed, which is the only
 * way an unsettled posting can be retried: the DocNumber is unique, so it cannot be entered twice.
 */
export function interpretReconcile({
  content,
  found,
}: {
  content: JournalEntryPostingContent;
  found: QboJournalEntry[];
}): JournalEntryDecision {
  if (found.length === 0) {
    return noEntryDecision({
      outcome: "failed",
      message: "Not found in QuickBooks, so it is safe to post again.",
    });
  }
  if (found.length > 1) {
    return noEntryDecision({
      outcome: "unknown",
      message: `${found.length} journal entries in QuickBooks carry this DocNumber. Resolve it in QuickBooks.`,
    });
  }

  const [entry] = found;
  if (!matchesPosting({ content, found: entry })) {
    return noEntryDecision({
      outcome: "unknown",
      message: `A journal entry with this DocNumber exists, but its date, lines or total (expected ${centsToDollars(content.totalCents).toFixed(2)}) differ. Check it in QuickBooks.`,
    });
  }
  return {
    outcome: "posted",
    qboId: entry.Id,
    qboSyncToken: entry.SyncToken ?? null,
    verified: true,
    message: "Found in QuickBooks by its DocNumber and it matches.",
  };
}

/** Whether a stored posting may be looked up: unknown, posted but unverified, or stuck in posting for a long time. */
export function isReconcilable({
  status,
  isVerified,
  updatedAtMs,
  nowMs,
  stuckPostingMs,
}: {
  status: JournalEntryPostingStatus;
  isVerified: boolean;
  updatedAtMs: number | null;
  nowMs: number;
  stuckPostingMs: number;
}): boolean {
  if (status === "unknown") return true;
  if (status === "posted") return !isVerified;
  if (status === "posting") return updatedAtMs !== null && nowMs - updatedAtMs >= stuckPostingMs;
  return false;
}

/**
 * A posting that has gone from posting to a state a retry can use. A stuck posting that was
 * not found settles as failed; one that could not be confirmed stays unknown.
 */
export function describeNotReconcilable(status: JournalEntryPostingStatus): string {
  if (status === "posting") {
    return "Sent a moment ago. If it still shows as posting after 10 minutes, look it up then.";
  }
  if (status === "posted") return "Already posted and verified.";
  return `A ${status} entry does not need reconciling.`;
}
