import { JournalEntryAttachmentDoc } from "@/app/qbo/journalEntry/types/QboJournalEntryAttachmentTypes";
import {
  JournalEntryPostOutcome,
  JournalEntryPosting,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import {
  PostSalesTaxPaymentResult,
  SalesTaxAttachmentStatus,
  SalesTaxPaymentStatus,
} from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";

// Pure helpers for the slice and the server, so the mapping rules can be tested.

/** The files without their text: the text never goes to the browser. */
export function toAttachmentStatuses(docs: JournalEntryAttachmentDoc[]): SalesTaxAttachmentStatus[] {
  return docs.map((doc) => ({
    fileName: doc.fileName,
    status: doc.status,
    ...(doc.qboAttachableId ? { qboAttachableId: doc.qboAttachableId } : {}),
    ...(doc.message ? { message: doc.message } : {}),
  }));
}

/** What a stored posting's status means as a post outcome, for postings that were not sent this time. */
export function outcomeOfPostingStatus(status: JournalEntryPosting["status"]): JournalEntryPostOutcome {
  if (status === "posted") return "posted";
  if (status === "failed") return "failed";
  if (status === "pending") return "pending";
  return "unknown";
}

/**
 * The stored status after a post: whatever the run sent or found replaces what was held, and a
 * posting the run did not touch stays as it was.
 */
export function mergePostIntoStatus({
  held,
  result,
}: {
  held: SalesTaxPaymentStatus | null;
  result: PostSalesTaxPaymentResult;
}): SalesTaxPaymentStatus {
  const base = held?.periodEnd === result.periodEnd ? held : null;
  return {
    periodEnd: result.periodEnd,
    payment: result.payment?.posting ?? base?.payment ?? null,
    adjustment: result.adjustment?.posting ?? base?.adjustment ?? null,
    attachments: result.attachments.length > 0 ? result.attachments : (base?.attachments ?? []),
  };
}
