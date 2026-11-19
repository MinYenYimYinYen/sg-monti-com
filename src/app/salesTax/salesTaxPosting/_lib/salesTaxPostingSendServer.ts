import { AppError } from "@/lib/errors/AppError";
import { postQboJournalEntries } from "@/app/qbo/journalEntry/_lib/qboJournalEntryServer";
import {
  attachFilesToPosting,
  loadAttachmentDocs,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryAttachmentServer";
import {
  JournalEntryInput,
  JournalEntryPosting,
  JournalEntryPostResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  PostSalesTaxPaymentResult,
  SalesTaxAttachmentStatus,
} from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";
import { toAttachmentStatuses } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingStateUtils";

// Server only. The small steps of a sales tax post, kept apart from the sequence in
// salesTaxPostingServer so each reads on its own.

export type SendOutcome =
  | { sent: true; result: JournalEntryPostResult }
  | { sent: false; problems: string[] };

/**
 * Sends one entry alone through the existing journal entry posting, so its claim, duplicate
 * lookup, batch and unknown-outcome rules apply, and reports what happened to it.
 */
export async function sendEntry({
  entry,
  postedByUserName,
}: {
  entry: JournalEntryInput;
  postedByUserName: string;
}): Promise<SendOutcome> {
  const run = await postQboJournalEntries({ entries: [entry], postedByUserName });
  const blockedEntry = run.blockedEntries.find((candidate) => candidate.docNumber === entry.docNumber);
  if (blockedEntry) return { sent: false, problems: blockedEntry.problems };
  const result = run.results.find((candidate) => candidate.posting.docNumber === entry.docNumber);
  if (!result) return { sent: false, problems: [run.stopReason ?? "The entry was not sent."] };
  return { sent: true, result };
}

/** Why an entry that was sent did not end as posted, for the user. */
export function problemOfUnsettled(result: JournalEntryPostResult): string {
  const label = result.posting.docNumber;
  const message = result.posting.postMessage ?? "";
  if (result.outcome === "unknown") {
    return `${label} may or may not be in QuickBooks. Reconcile it before posting again. ${message}`.trim();
  }
  return `${label} did not post: ${message || result.outcome}`.trim();
}

export function emptyPostResult(periodEnd: string): PostSalesTaxPaymentResult {
  return { periodEnd, adjustment: null, payment: null, attachments: [], problems: [], warnings: [] };
}

/**
 * Attaches the stored files of a posted payment and returns their statuses. Failing to reach
 * QuickBooks is a problem to show, not a throw: the entry is posted and must still be reported.
 */
export async function attachAndDescribe(
  payment: JournalEntryPosting,
): Promise<{ attachments: SalesTaxAttachmentStatus[]; problems: string[] }> {
  try {
    const docs = await attachFilesToPosting(payment);
    return { attachments: toAttachmentStatuses(docs), problems: [] };
  } catch (error) {
    const docs = await loadAttachmentDocs(payment.docNumber);
    const reason = error instanceof AppError ? error.message : "QuickBooks could not be reached.";
    return {
      attachments: toAttachmentStatuses(docs),
      problems: [
        `${payment.docNumber} posted, but its files are not attached yet: ${reason} Use Retry files.`,
      ],
    };
  }
}
