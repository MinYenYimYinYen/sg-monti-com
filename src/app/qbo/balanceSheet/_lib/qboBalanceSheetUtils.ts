import {
  QboBalanceSheetQuery,
  QboBalanceSheetReport,
  QboReportRow,
} from "@/app/qbo/balanceSheet/types/QboBalanceSheetTypes";

// Pure helpers for the balance sheet module, free of fetch and the database so they can be tested.

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ACCOUNT_ID_PATTERN = /^\d+$/;

/** The query string for the report, URL encoded. */
export function buildBalanceSheetQueryString({
  end_date,
  accounting_method,
}: QboBalanceSheetQuery): string {
  return `end_date=${encodeURIComponent(end_date)}&accounting_method=${encodeURIComponent(accounting_method)}`;
}

/** True for a YYYY-MM-DD string that is a real calendar date. */
export function isRealIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day
  );
}

/** QuickBooks Ids are digits. Anything else is refused before it reaches a query. */
export function isSafeAccountId(value: unknown): value is string {
  return typeof value === "string" && ACCOUNT_ID_PATTERN.test(value);
}

/** Whole cents from the report's decimal string ("-9337.50"), without floating point. Null if not a number. */
export function parseReportAmountToCents(raw: string): number | null {
  const match = raw.trim().match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  if (cents === 0) return 0;
  return match[1] ? -cents : cents;
}

export type AccountRowLookup =
  | { found: "balance"; balanceCents: number }
  | { found: "section" }
  | { found: "unreadable"; text: string }
  | { found: "absent" };

/**
 * Looks one account up in the report tree. A data row carries the account's Id in its first column
 * and the amount in its second. An account with sub-accounts appears as a section header instead,
 * so it has no single figure of its own: that is reported as `section`, and the caller decides.
 * A row whose amount is not a number is `unreadable`, never a guess. An account that is nowhere in
 * the report is `absent`. UNVERIFIED: this app treats that as a zero balance, on the belief that
 * QuickBooks leaves zero balance accounts off the report.
 */
export function findAccountInReport({
  report,
  accountId,
}: {
  report: QboBalanceSheetReport;
  accountId: string;
}): AccountRowLookup {
  let sawSection = false;

  const visit = (rows: QboReportRow[]): AccountRowLookup | null => {
    for (const row of rows) {
      if (row.ColData?.[0]?.id === accountId) {
        const text = row.ColData?.[1]?.value ?? "";
        const balanceCents = parseReportAmountToCents(text);
        return balanceCents === null
          ? { found: "unreadable", text }
          : { found: "balance", balanceCents };
      }
      if (row.Header?.ColData?.[0]?.id === accountId) sawSection = true;
      const nested = visit(row.Rows?.Row ?? []);
      if (nested) return nested;
    }
    return null;
  };

  const lookup = visit(report.Rows.Row ?? []);
  if (lookup) return lookup;
  return sawSection ? { found: "section" } : { found: "absent" };
}
