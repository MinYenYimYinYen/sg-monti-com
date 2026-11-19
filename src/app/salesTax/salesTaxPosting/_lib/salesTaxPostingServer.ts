import { loadPostingsByDocNumber } from "@/app/qbo/journalEntry/_lib/qboJournalEntrySettleServer";
import { saveAttachmentsAhead } from "@/app/qbo/journalEntry/_lib/qboJournalEntryAttachmentServer";
import { PostSalesTaxPaymentResult } from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";
import { planSalesTaxPayment } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingPlanServer";
import { validatePostInput } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingInputUtils";
import {
  attachAndDescribe,
  emptyPostResult,
  problemOfUnsettled,
  sendEntry,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingSendServer";
import { outcomeOfPostingStatus } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingStateUtils";
import {
  adjustmentDocNumber,
  attachmentFileNames,
  paymentDocNumber,
  todayInChicago,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingUtils";

// Server only. The ONLY code that posts a sales tax payment. The entries go through the existing
// postQboJournalEntries, so its claim, duplicate lookup, batch and unknown-outcome rules apply.
//
// Order, and why:
// 1. Everything is validated and planned first. Nothing is sent if anything is wrong.
// 2. The files are stored before anything is sent, so a retry sends the same bytes.
// 3. The adjustment goes first and alone. The payment is only sent if it posted, because the
//    payment amount was computed against the balance the adjustment produces.
// 4. The files are only sent after the payment posted. A file that fails never undoes the entry.

export async function postSalesTaxPayment({
  periodEnd,
  paymentCents,
  expectedBalanceCents,
  returnFileText,
  taxCodeReportCsv,
  postedByUserName,
}: {
  periodEnd: string;
  paymentCents: number;
  expectedBalanceCents: number;
  returnFileText: string;
  taxCodeReportCsv: string;
  postedByUserName: string;
}): Promise<PostSalesTaxPaymentResult> {
  const today = todayInChicago(new Date());
  const inputProblems = validatePostInput({
    periodEnd,
    paymentCents,
    expectedBalanceCents,
    returnFileText,
    taxCodeReportCsv,
    today,
  });
  if (inputProblems.length > 0) return { ...emptyPostResult(periodEnd), problems: inputProblems };

  const paymentDoc = paymentDocNumber(periodEnd);
  const adjustmentDoc = adjustmentDocNumber(periodEnd);
  const existing = await loadPostingsByDocNumber([paymentDoc, adjustmentDoc]);
  const existingPayment = existing.get(paymentDoc);
  const existingAdjustment = existing.get(adjustmentDoc);
  const names = attachmentFileNames(periodEnd);
  const files = [
    { fileName: names.taxCodeReport, contentType: "text/csv", text: taxCodeReportCsv },
    { fileName: names.returnFile, contentType: "text/plain", text: returnFileText },
  ];

  // A payment already sent is never sent again. If it posted, its files are brought up to date.
  if (existingPayment && existingPayment.status !== "pending" && existingPayment.status !== "failed") {
    const outcome = outcomeOfPostingStatus(existingPayment.status);
    if (existingPayment.status !== "posted") {
      return {
        ...emptyPostResult(periodEnd),
        payment: { posting: existingPayment, outcome },
        problems: [problemOfUnsettled({ posting: existingPayment, outcome })],
      };
    }
    await saveAttachmentsAhead({ docNumber: paymentDoc, files });
    const attached = await attachAndDescribe(existingPayment);
    return {
      ...emptyPostResult(periodEnd),
      payment: { posting: existingPayment, outcome: "posted" },
      adjustment: existingAdjustment
        ? { posting: existingAdjustment, outcome: outcomeOfPostingStatus(existingAdjustment.status) }
        : null,
      attachments: attached.attachments,
      problems: attached.problems,
    };
  }

  const plan = await planSalesTaxPayment({
    periodEnd,
    today,
    paymentCents,
    expectedBalanceCents,
    existingAdjustment,
  });
  if (plan.kind === "blocked") return { ...emptyPostResult(periodEnd), problems: plan.problems };

  await saveAttachmentsAhead({ docNumber: paymentDoc, files });

  const result = { ...emptyPostResult(periodEnd), warnings: plan.warnings };

  if (plan.adjustment) {
    const sent = await sendEntry({ entry: plan.adjustment, postedByUserName });
    if (!sent.sent) return { ...result, problems: sent.problems };
    result.adjustment = sent.result;
    if (sent.result.outcome !== "posted") {
      return { ...result, problems: [problemOfUnsettled(sent.result)] };
    }
  } else if (existingAdjustment) {
    result.adjustment = {
      posting: existingAdjustment,
      outcome: outcomeOfPostingStatus(existingAdjustment.status),
    };
  }

  const sentPayment = await sendEntry({ entry: plan.payment, postedByUserName });
  if (!sentPayment.sent) return { ...result, problems: sentPayment.problems };
  result.payment = sentPayment.result;
  if (sentPayment.result.outcome !== "posted") {
    return { ...result, problems: [problemOfUnsettled(sentPayment.result)] };
  }

  const attached = await attachAndDescribe(sentPayment.result.posting);
  return { ...result, attachments: attached.attachments, problems: attached.problems };
}
