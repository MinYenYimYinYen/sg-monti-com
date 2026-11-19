import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import {
  JournalEntryInput,
  JournalEntryLineInput,
  JournalEntryPosting,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";
import { LineTarget, resolveName } from "@/app/javelin/_lib/entryBuild";
import { SALES_TAX_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";
import { DepositLinkKey, SalesTaxLinkKey } from "@/app/javelin/JavelinTypes";

// Pure helpers for the sales tax payment: dates, DocNumbers, the account checks and the entries to
// post. Server side: it reaches entryBuild, which hashes with Node crypto, so the browser uses
// salesTaxMoneyUtils and mnReturnFileReader instead. Free of fetch, the database and the clock (the
// date is passed in) so they can be tested. All money is whole cents. The payable account is a
// liability, so its balance is credit positive: a credit balance of 100.00 is +10000.

const ADJUSTMENT_DESCRIPTION = "adj to 0 corrects realGreen discrep";
const TIME_ZONE = "America/Chicago";

/** The business's calendar date today as YYYY-MM-DD, whatever time zone the server runs in. */
export function todayInChicago(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isRealDate({ year, month, day }: { year: number; month: number; day: number }): boolean {
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
  );
}

/** A message for the user, or null when `periodEnd` is the last day of a month that is over. */
export function validatePeriodEnd({
  periodEnd,
  today,
}: {
  periodEnd: unknown;
  today: string;
}): string | null {
  if (typeof periodEnd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
    return "The period must be a date written YYYY-MM-DD.";
  }
  const year = Number(periodEnd.slice(0, 4));
  const month = Number(periodEnd.slice(5, 7));
  const day = Number(periodEnd.slice(8, 10));
  if (!isRealDate({ year, month, day })) return "The period is not a real date.";
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day !== lastDay) return "The period must end on the last day of a month.";
  if (today <= periodEnd) return `The period ends ${periodEnd}. Pay once the month is over.`;
  return null;
}

/** "ST-2026-09". The reference number is the month, so one month has one payment. */
export function paymentDocNumber(periodEnd: string): string {
  return `ST-${periodEnd.slice(0, 7)}`;
}

export function adjustmentDocNumber(periodEnd: string): string {
  return `${paymentDocNumber(periodEnd)}-ADJ`;
}

/** The attachment names, one per file, so a month's files are recognizable in QuickBooks. */
export function attachmentFileNames(periodEnd: string): {
  returnFile: string;
  taxCodeReport: string;
} {
  const month = periodEnd.slice(0, 7);
  return {
    returnFile: `mn-sales-tax-${month}.txt`,
    taxCodeReport: `realgreen-tax-code-report-${month}.csv`,
  };
}

/** The adjustment as stored, read back from the payable account's line. Null if it has no such line. */
export function signedAdjustmentOfPosting({
  posting,
  payableAccountId,
}: {
  posting: JournalEntryPosting;
  payableAccountId: string;
}): number | null {
  const line = posting.lines.find((candidate) => candidate.accountId === payableAccountId);
  if (!line) return null;
  return line.postingType === "Credit" ? line.amountCents : -line.amountCents;
}

export type SalesTaxLinks = Map<DepositLinkKey, LineTarget>;

const SALES_TAX_KEYS: SalesTaxLinkKey[] = [
  "salesTaxPayableAccount",
  "salesTaxBankAccount",
  "salesTaxAdjustmentAccount",
];

/** Everything wrong with the three account links, in words the user can act on. Empty means usable. */
export function checkSalesTaxLinks({
  links,
  accountMap,
}: {
  links: SalesTaxLinks;
  accountMap: Map<string, QboAccount>;
}): string[] {
  const problems: string[] = [];

  for (const key of SALES_TAX_KEYS) {
    const target = links.get(key);
    if (!target) {
      problems.push(`${SALES_TAX_LINK_LABELS[key]}: not linked to a QuickBooks account.`);
      continue;
    }
    const account = accountMap.get(target.qboAccountId);
    if (!account) {
      problems.push(`${SALES_TAX_LINK_LABELS[key]}: the linked account was not found in QuickBooks.`);
    } else if (!account.Active) {
      problems.push(`${SALES_TAX_LINK_LABELS[key]}: "${account.Name}" is inactive in QuickBooks.`);
    }
  }
  if (problems.length > 0) return problems;

  const ids = SALES_TAX_KEYS.map((key) => links.get(key)!.qboAccountId);
  if (new Set(ids).size !== ids.length) {
    problems.push("The payable, bank and adjustment accounts must be three different accounts.");
  }
  const payable = accountMap.get(links.get("salesTaxPayableAccount")!.qboAccountId)!;
  if (payable.Classification !== "Liability") {
    problems.push(
      `Sales Tax Payable: "${payable.Name}" is not a liability account, so its balance cannot be read as an amount owed.`,
    );
  }
  return problems;
}

/** One side of an entry, with the customer or vendor the account takes, if any. */
function buildLine({
  postingType,
  target,
  accountMap,
  amountCents,
  description,
}: {
  postingType: "Debit" | "Credit";
  target: LineTarget;
  accountMap: Map<string, QboAccount>;
  amountCents: number;
  description?: string;
}): JournalEntryLineInput {
  return {
    postingType,
    accountId: target.qboAccountId,
    amountCents,
    ...(description ? { description } : {}),
    ...resolveName({ target, qboAccount: accountMap.get(target.qboAccountId) ?? null }),
  };
}

export type SalesTaxEntries = {
  payment: JournalEntryInput;
  /** Null when the payment equals the month-end balance, or the caller left the adjustment out. */
  adjustment: JournalEntryInput | null;
};

/**
 * The payment (dated `today`) and, when needed, the adjustment (dated the period end). The links
 * must have passed checkSalesTaxLinks. The payment has no description and neither entry a note;
 * only the adjustment's lines say why it exists.
 */
export function buildSalesTaxEntries({
  periodEnd,
  today,
  paymentCents,
  monthEndBalanceCents,
  adjustmentCents,
  sourceHash,
  links,
  accountMap,
}: {
  periodEnd: string;
  today: string;
  paymentCents: number;
  monthEndBalanceCents: number;
  adjustmentCents: number;
  sourceHash: string;
  links: SalesTaxLinks;
  accountMap: Map<string, QboAccount>;
}): SalesTaxEntries {
  const payable = links.get("salesTaxPayableAccount")!;
  const bank = links.get("salesTaxBankAccount")!;
  const adjustmentAccount = links.get("salesTaxAdjustmentAccount")!;
  const payDoc = paymentDocNumber(periodEnd);

  const payment: JournalEntryInput = {
    docNumber: payDoc,
    txnDate: today,
    lines: [
      buildLine({ postingType: "Debit", target: payable, accountMap, amountCents: paymentCents }),
      buildLine({ postingType: "Credit", target: bank, accountMap, amountCents: paymentCents }),
    ],
    source: { kind: "salesTaxPayment", sourceHash, periodEnd, monthEndBalanceCents, adjustmentCents },
  };

  if (adjustmentCents === 0) return { payment, adjustment: null };

  const amountCents = Math.abs(adjustmentCents);
  // A positive adjustment adds credit to the payable account, so the adjustments account takes the debit.
  const payableSide = adjustmentCents > 0 ? "Credit" : "Debit";
  const adjustmentSide = adjustmentCents > 0 ? "Debit" : "Credit";
  const adjustment: JournalEntryInput = {
    docNumber: adjustmentDocNumber(periodEnd),
    txnDate: periodEnd,
    lines: [
      buildLine({
        postingType: payableSide,
        target: payable,
        accountMap,
        amountCents,
        description: ADJUSTMENT_DESCRIPTION,
      }),
      buildLine({
        postingType: adjustmentSide,
        target: adjustmentAccount,
        accountMap,
        amountCents,
        description: ADJUSTMENT_DESCRIPTION,
      }),
    ],
    source: { kind: "salesTaxAdjustment", sourceHash, periodEnd, paymentDocNumber: payDoc },
  };
  return { payment, adjustment };
}

