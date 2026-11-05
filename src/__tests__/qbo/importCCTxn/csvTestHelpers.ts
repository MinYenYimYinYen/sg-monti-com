import { parseImportCsvText } from "@/app/qbo/importCCTxn/_lib/importCsvParser";
import { ImportCsvRow } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

// Helpers for the bank format tests. Headers are the exact columns each bank exports.

export const CHASE_HEADER = "Card,Transaction Date,Post Date,Description,Category,Type,Amount,Memo";
export const CAPITAL_ONE_HEADER =
  "Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit";

export function chaseLine({
  card = "3201",
  transactionDate = "10/21/2026",
  postDate = "10/22/2026",
  description = "TARGET T-2180",
  category = "Food & Drink",
  type = "Sale",
  amount = "-15.84",
  memo = "",
}: {
  card?: string;
  transactionDate?: string;
  postDate?: string;
  description?: string;
  category?: string;
  type?: string;
  amount?: string;
  memo?: string;
} = {}): string {
  return [card, transactionDate, postDate, description, category, type, amount, memo].join(",");
}

export function capitalOneLine({
  transactionDate = "2026-10-27",
  postedDate = "2026-10-28",
  card = "2238",
  description = "ANTHROPIC",
  category = "Merchandise",
  debit = "95.91",
  credit = "",
}: {
  transactionDate?: string;
  postedDate?: string;
  card?: string;
  description?: string;
  category?: string;
  debit?: string;
  credit?: string;
} = {}): string {
  return [transactionDate, postedDate, card, description, category, debit, credit].join(",");
}

export function csvText(...lines: string[]): string {
  return lines.join("\n");
}

/** The rows of a file that must parse cleanly. Fails the test with the errors if it does not. */
export function parseRows(text: string): ImportCsvRow[] {
  const result = parseImportCsvText(text);
  if (!result.success) {
    throw new Error(`Expected a clean parse, got: ${result.errors.join(" | ")}`);
  }
  return result.rows;
}

/** The errors of a file that must be rejected. Fails the test if it is accepted. */
export function parseErrors(text: string): string[] {
  const result = parseImportCsvText(text);
  if (result.success) throw new Error("Expected the file to be rejected, but it parsed.");
  return result.errors;
}
