import {
  QboPurchase,
  QboPurchaseRange,
  QboPurchaseSummary,
} from "@/app/qbo/purchase/types/QboPurchaseTypes";

// Pure helpers for purchases, free of fetch and the database so they can be tested.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Keeps only what the browser needs. TotalAmt falls back to the sum of the lines, which Intuit says it must equal. */
export function summarizePurchase(purchase: QboPurchase): QboPurchaseSummary {
  const lines = (purchase.Line ?? []).map((line) => ({
    Amount: line.Amount,
    Description: line.Description ?? null,
    AccountRef: line.AccountBasedExpenseLineDetail?.AccountRef ?? null,
  }));
  return {
    Id: purchase.Id,
    SyncToken: purchase.SyncToken,
    PaymentType: purchase.PaymentType,
    TxnDate: purchase.TxnDate ?? null,
    DocNumber: purchase.DocNumber ?? null,
    PrivateNote: purchase.PrivateNote ?? null,
    Credit: purchase.Credit ?? false,
    TotalAmt: purchase.TotalAmt ?? roundToCents(lines.reduce((sum, line) => sum + line.Amount, 0)),
    AccountRef: purchase.AccountRef,
    EntityRef: purchase.EntityRef ?? null,
    Lines: lines,
  };
}

/** Newest first. Ties break on the numeric Id, which QuickBooks hands out in order. */
export function sortPurchasesNewestFirst(purchases: QboPurchaseSummary[]): QboPurchaseSummary[] {
  return [...purchases].sort((a, b) => {
    const byDate = (b.TxnDate ?? "").localeCompare(a.TxnDate ?? "");
    return byDate !== 0 ? byDate : Number(b.Id) - Number(a.Id);
  });
}

/** The only kind this app posts, so the only kind that matters for reconciliation. */
export function pickCreditCardPurchases(purchases: QboPurchaseSummary[]): QboPurchaseSummary[] {
  return purchases.filter((purchase) => purchase.PaymentType === "CreditCard");
}

/** Charges minus refunds, rounded to cents, for comparing a month against a card statement. */
export function netPurchaseTotal(purchases: QboPurchaseSummary[]): number {
  return roundToCents(
    purchases.reduce((sum, purchase) => sum + (purchase.Credit ? -purchase.TotalAmt : purchase.TotalAmt), 0),
  );
}

/** The expense account of a purchase: one name, "Split (n)" when lines differ, or blank. */
export function describeExpenseAccounts(purchase: QboPurchaseSummary): string {
  const names = new Set<string>();
  for (const line of purchase.Lines) {
    if (line.AccountRef) names.add(line.AccountRef.name ?? line.AccountRef.value);
  }
  if (names.size === 0) return "";
  if (names.size === 1) return [...names][0] ?? "";
  return `Split (${names.size})`;
}

// Dates

/** Milliseconds at UTC midnight for a real YYYY-MM-DD date, or null for anything else (such as 2026-02-31). */
function parseIsoDate(value: string): number | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  const isRealDate =
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return isRealDate ? ms : null;
}

/**
 * Returns a message for the user, or null when the range is fine. The server relies on this
 * before putting the dates into Intuit's query text, so it must stay strict: only real
 * YYYY-MM-DD dates get through.
 */
export function validatePurchaseRange({
  range,
  maxDays,
}: {
  range: QboPurchaseRange;
  maxDays: number;
}): string | null {
  const start = parseIsoDate(range.startDate);
  const end = parseIsoDate(range.endDate);
  if (start === null || end === null) return "Enter a start and end date.";
  if (start > end) return "The start date must be on or before the end date.";
  const days = Math.round((end - start) / MS_PER_DAY) + 1;
  if (days > maxDays) return `Choose a range of at most ${maxDays} days.`;
  return null;
}

/** Intuit query text for a range. Call validatePurchaseRange first. UNVERIFIED against live QuickBooks. */
export function buildPurchaseWhere(range: QboPurchaseRange): string {
  return `TxnDate >= '${range.startDate}' AND TxnDate <= '${range.endDate}'`;
}

/** Local calendar date as YYYY-MM-DD. toISOString would shift it to UTC, which can land on another day. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** From the first of the current month through today. */
export function monthToDateRange(now: Date): QboPurchaseRange {
  return {
    startDate: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toIsoDate(now),
  };
}
