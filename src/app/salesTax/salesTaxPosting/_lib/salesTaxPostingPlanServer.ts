import { qboConst } from "@/app/qbo/_lib/qboConst";
import { readQboAccountBalance } from "@/app/qbo/balanceSheet/_lib/qboBalanceSheetServer";
import {
  JournalEntryInput,
  JournalEntryPosting,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { loadAccountMap, loadSalesTaxLinks } from "@/app/javelin/_lib/javelinContextServer";
import { computeSalesTaxPeriodHash } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxSourceHash";
import {
  computeAdjustmentCents,
  describeCents,
  exceedsAdjustmentWarning,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxMoneyUtils";
import {
  buildSalesTaxEntries,
  checkSalesTaxLinks,
  signedAdjustmentOfPosting,
} from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingUtils";

// Server only. Reads QuickBooks accounts, the stored links and the month-end balance, and decides
// what a post would send. It writes nothing.

export type SalesTaxPostPlan =
  | { kind: "blocked"; problems: string[] }
  | {
      kind: "ready";
      payment: JournalEntryInput;
      /** Null when no adjustment is needed or the adjustment is already posted. */
      adjustment: JournalEntryInput | null;
      warnings: string[];
    };

function blocked(...problems: string[]): SalesTaxPostPlan {
  return { kind: "blocked", problems };
}

/**
 * Plans the entries for a payment whose own entry has not been sent. The month-end balance is read
 * fresh and must be the one the caller saw. An adjustment already posted is part of that balance,
 * so the payment must then equal it; one whose outcome is unknown blocks everything, because the
 * balance cannot be trusted until it is reconciled.
 */
export async function planSalesTaxPayment({
  periodEnd,
  today,
  paymentCents,
  expectedBalanceCents,
  existingAdjustment,
}: {
  periodEnd: string;
  today: string;
  paymentCents: number;
  expectedBalanceCents: number;
  existingAdjustment: JournalEntryPosting | undefined;
}): Promise<SalesTaxPostPlan> {
  const [links, accountMap] = await Promise.all([loadSalesTaxLinks(), loadAccountMap()]);
  const linkProblems = checkSalesTaxLinks({ links, accountMap });
  if (linkProblems.length > 0) return { kind: "blocked", problems: linkProblems };

  const payableAccountId = links.get("salesTaxPayableAccount")!.qboAccountId;
  const { balanceCents } = await readQboAccountBalance({
    accountId: payableAccountId,
    asOfDate: periodEnd,
  });
  if (balanceCents !== expectedBalanceCents) {
    return blocked(
      `The month-end balance changed in QuickBooks: it is ${describeCents(balanceCents)} now and the dialog showed ${describeCents(expectedBalanceCents)}. Review the amount and try again.`,
    );
  }

  const adjustmentStatus = existingAdjustment?.status;
  if (adjustmentStatus === "unknown" || adjustmentStatus === "posting") {
    return blocked(
      "The adjustment for this month may or may not be in QuickBooks. Reconcile it before posting the payment.",
    );
  }

  let adjustmentCents: number;
  let monthEndBalanceCents: number;
  let adjustmentAlreadyPosted = false;
  if (existingAdjustment && adjustmentStatus === "posted") {
    const stored = signedAdjustmentOfPosting({ posting: existingAdjustment, payableAccountId });
    if (stored === null) {
      return blocked("The posted adjustment has no line on the payable account. Check QuickBooks.");
    }
    // The posted adjustment is already in the balance, so only the payment that matches it fits.
    if (paymentCents !== balanceCents) {
      return blocked(
        `The adjustment for this month is already posted, so the payment must be ${describeCents(balanceCents)}, the month-end balance now.`,
      );
    }
    adjustmentCents = stored;
    monthEndBalanceCents = balanceCents - stored;
    adjustmentAlreadyPosted = true;
  } else {
    adjustmentCents = computeAdjustmentCents({ paymentCents, balanceCents });
    monthEndBalanceCents = balanceCents;
  }

  const entries = buildSalesTaxEntries({
    periodEnd,
    today,
    paymentCents,
    monthEndBalanceCents,
    adjustmentCents,
    sourceHash: computeSalesTaxPeriodHash(periodEnd),
    links,
    accountMap,
  });

  const warnings: string[] = [];
  if (
    !adjustmentAlreadyPosted &&
    exceedsAdjustmentWarning({ adjustmentCents, warnCents: qboConst.salesTaxAdjustmentWarnCents })
  ) {
    warnings.push(
      `The adjustment is ${describeCents(Math.abs(adjustmentCents))}, more than ${describeCents(qboConst.salesTaxAdjustmentWarnCents)}. It was posted anyway. Check the amount you paid.`,
    );
  }
  return {
    kind: "ready",
    payment: entries.payment,
    adjustment: adjustmentAlreadyPosted ? null : entries.adjustment,
    warnings,
  };
}
