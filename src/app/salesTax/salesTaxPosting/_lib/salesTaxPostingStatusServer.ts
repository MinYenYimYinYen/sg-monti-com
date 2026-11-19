import {
  loadPostingsByDocNumber,
  validationError,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import { loadAttachmentDocs } from "@/app/qbo/journalEntry/_lib/qboJournalEntryAttachmentServer";
import {
  RetrySalesTaxAttachmentsResult,
  SalesTaxPaymentStatus,
} from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";
import { attachAndDescribe } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingSendServer";
import { toAttachmentStatuses } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingStateUtils";
import {
  adjustmentDocNumber,
  paymentDocNumber,
  validatePeriodEnd,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingUtils";

// Server only. Reads and settles what a month's payment has stored. Creates no journal entry.

// Far enough in the future that no real month is "not over yet": these reads only need the shape
// of the period, not whether it has ended.
const ANY_PERIOD_IS_OVER = "9999-12-31";

function checkPeriod(periodEnd: string): void {
  const problem = validatePeriodEnd({ periodEnd, today: ANY_PERIOD_IS_OVER });
  if (problem) throw validationError(problem);
}

/** Attaches whatever the posted payment still lacks in QuickBooks. Creates no entry. */
export async function retrySalesTaxAttachments(
  periodEnd: string,
): Promise<RetrySalesTaxAttachmentsResult> {
  checkPeriod(periodEnd);
  const paymentDoc = paymentDocNumber(periodEnd);
  const payment = (await loadPostingsByDocNumber([paymentDoc])).get(paymentDoc);
  if (!payment) throw validationError("No payment has been saved for this month.");
  if (payment.status !== "posted") {
    return {
      periodEnd,
      attachments: toAttachmentStatuses(await loadAttachmentDocs(paymentDoc)),
      problems: [`The payment is ${payment.status}, so its files cannot be attached yet.`],
    };
  }
  const attached = await attachAndDescribe(payment);
  return { periodEnd, attachments: attached.attachments, problems: attached.problems };
}

/** What our own records say about a month's payment. Never touches QuickBooks. */
export async function loadSalesTaxPaymentStatus(periodEnd: string): Promise<SalesTaxPaymentStatus> {
  checkPeriod(periodEnd);
  const paymentDoc = paymentDocNumber(periodEnd);
  const postings = await loadPostingsByDocNumber([paymentDoc, adjustmentDocNumber(periodEnd)]);
  return {
    periodEnd,
    payment: postings.get(paymentDoc) ?? null,
    adjustment: postings.get(adjustmentDocNumber(periodEnd)) ?? null,
    attachments: toAttachmentStatuses(await loadAttachmentDocs(paymentDoc)),
  };
}
