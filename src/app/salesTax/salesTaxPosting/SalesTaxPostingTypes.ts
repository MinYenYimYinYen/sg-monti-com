import {
  JournalEntryPosting,
  JournalEntryPostResult,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { JournalEntryAttachmentStatus } from "@/app/qbo/journalEntry/types/QboJournalEntryAttachmentTypes";

/** One file on the payment entry, without its text. */
export type SalesTaxAttachmentStatus = {
  fileName: string;
  status: JournalEntryAttachmentStatus;
  qboAttachableId?: string;
  message?: string;
};

/**
 * What the stored records say about a month's payment. Either posting is null until it has been
 * tried. `adjustment` is null too when the payment needed none.
 */
export type SalesTaxPaymentStatus = {
  periodEnd: string;
  payment: JournalEntryPosting | null;
  adjustment: JournalEntryPosting | null;
  attachments: SalesTaxAttachmentStatus[];
};

/**
 * The answer to a post request. Problems mean nothing (or nothing more) was sent, with the reasons.
 * Warnings do not stop the post. `adjustment` and `payment` are null when that entry was not sent.
 */
export type PostSalesTaxPaymentResult = {
  periodEnd: string;
  adjustment: JournalEntryPostResult | null;
  payment: JournalEntryPostResult | null;
  attachments: SalesTaxAttachmentStatus[];
  problems: string[];
  warnings: string[];
};

/** The answer to a retry: the files' statuses after QuickBooks was checked. */
export type RetrySalesTaxAttachmentsResult = {
  periodEnd: string;
  attachments: SalesTaxAttachmentStatus[];
  problems: string[];
};
