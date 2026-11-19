import { parseMoneyToCents } from "@/app/qbo/importCCTxn/_lib/importCsvValues";
import {
  computeAdjustmentCents,
  describeCents,
  exceedsAdjustmentWarning,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxMoneyUtils";

/** The payable account's balance in words: a credit balance is what is owed. */
export function describeBalance(balanceCents: number): string {
  if (balanceCents === 0) return "$0.00";
  return balanceCents > 0
    ? `${describeCents(balanceCents)} owed (credit)`
    : `${describeCents(-balanceCents)} overpaid (debit)`;
}

/** What the adjustment entry will do, for the preview. Null when there is nothing to show yet. */
export function describeAdjustment({
  adjustmentCents,
  periodEnd,
}: {
  adjustmentCents: number | null;
  periodEnd: string;
}): string | null {
  if (adjustmentCents === null) return null;
  if (adjustmentCents === 0) return "No adjustment entry is needed.";
  const amount = describeCents(Math.abs(adjustmentCents));
  return adjustmentCents > 0
    ? `Adjustment dated ${periodEnd}: credit Sales Tax Payable and debit the adjustments account ${amount}.`
    : `Adjustment dated ${periodEnd}: debit Sales Tax Payable and credit the adjustments account ${amount}.`;
}

// Pure. What the dialog shows for the amount the user typed. The server re-checks everything, so
// this only decides what to display and whether the Post button is worth enabling.

export type PaymentPreview = {
  /** The typed amount in whole cents, or null while it is empty or not a number. */
  paymentCents: number | null;
  /**
   * What the adjustment adds to the payable account's credit balance on the period end. Positive
   * credits the payable account, negative debits it, zero means no adjustment entry.
   */
  adjustmentCents: number | null;
  /** Shown beside the input when the amount cannot be used. */
  problem: string | null;
  /** The adjustment is larger than the warning size. It does not stop the post. */
  adjustmentIsLarge: boolean;
  canPost: boolean;
};

const EMPTY_PREVIEW: PaymentPreview = {
  paymentCents: null,
  adjustmentCents: null,
  problem: null,
  adjustmentIsLarge: false,
  canPost: false,
};

export function buildPaymentPreview({
  amountText,
  balanceCents,
  adjustmentAlreadyPosted,
  warnCents,
}: {
  amountText: string;
  /** The payable account's balance now, credit positive, or null until it has been read. */
  balanceCents: number | null;
  /** An adjustment for this month is already posted, so its effect is in `balanceCents`. */
  adjustmentAlreadyPosted: boolean;
  warnCents: number;
}): PaymentPreview {
  if (amountText.trim() === "") return EMPTY_PREVIEW;

  const paymentCents = parseMoneyToCents(amountText);
  if (paymentCents === null) {
    return { ...EMPTY_PREVIEW, problem: "Enter the amount as dollars and cents, such as 12345.67." };
  }
  if (paymentCents <= 0) {
    return { ...EMPTY_PREVIEW, paymentCents, problem: "The payment must be more than zero." };
  }
  if (balanceCents === null) return { ...EMPTY_PREVIEW, paymentCents };

  if (adjustmentAlreadyPosted) {
    // The posted adjustment is in the balance already, so only the payment that matches it fits.
    const matches = paymentCents === balanceCents;
    return {
      paymentCents,
      adjustmentCents: 0,
      problem: matches ? null : "The adjustment is already posted, so the payment must equal the balance shown.",
      adjustmentIsLarge: false,
      canPost: matches,
    };
  }

  const adjustmentCents = computeAdjustmentCents({ paymentCents, balanceCents });
  return {
    paymentCents,
    adjustmentCents,
    problem: null,
    adjustmentIsLarge: exceedsAdjustmentWarning({ adjustmentCents, warnCents }),
    canPost: true,
  };
}
