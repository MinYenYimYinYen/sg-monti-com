import { GenLedgerRow } from "@/app/javelin/JavelinTypes";

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Splits rows into those that carry a real ledger amount and those whose debits and credits
 * cancel out (net $0.00 after rounding to cents). A zero-net account has no ledger line, and
 * QuickBooks rejects a journal line with no amount.
 */
export function splitZeroNetRows(rows: GenLedgerRow[]): {
  postingRows: GenLedgerRow[];
  zeroNetRows: GenLedgerRow[];
} {
  const postingRows = rows.filter((row) => toCents(row.totalNetAmount) !== 0);
  const zeroNetRows = rows.filter((row) => toCents(row.totalNetAmount) === 0);
  return { postingRows, zeroNetRows };
}

/** The CRM names its accounts "102.2 - CK PAYMENTS". The text before " - " is the RealGreen account id. */
export function rgAccountIdFromCrmName(crmName: string): string {
  return crmName.split(" - ")[0].trim();
}
