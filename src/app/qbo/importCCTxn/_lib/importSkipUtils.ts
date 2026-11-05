import { ImportSkipReason, SkipRule } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";

// Pure helpers for skipping. applySkipRuleToRows is what the browser applies to its own copy of
// the rows when a skip rule is saved. The server does the same thing in the database with
// skipPendingRowsForMerchant (importRowAccessServer), using the same rule: only this merchant's
// pending rows change. Keep the two in step.

/** The only reason a person can give today. Item purchases are not expenses and are not handled yet. */
export const DEFAULT_MANUAL_SKIP_REASON: ImportSkipReason = "inventoryPurchase";

/** Payments and refunds are always skipped and never come back. Every other skip can be undone. */
export function isRestorableSkip(row: Pick<ImportRow, "status" | "skipReason">): boolean {
  return row.status === "skipped" && row.skipReason !== "payment" && row.skipReason !== "refund";
}

/** Only a pending row can be skipped by a rule. A row that is posting, posted, failed or unknown is left alone. */
export function isSkippableByRule({
  row,
  skipRule,
}: {
  row: Pick<ImportRow, "status" | "merchantKey">;
  skipRule: Pick<SkipRule, "merchantKey">;
}): boolean {
  return row.status === "pending" && row.merchantKey === skipRule.merchantKey;
}

/** The rows after a skip rule is saved: this merchant's pending rows become skipped. Returns a new list. */
export function applySkipRuleToRows({
  rows,
  skipRule,
}: {
  rows: ImportRow[];
  skipRule: SkipRule;
}): ImportRow[] {
  return rows.map((row) =>
    isSkippableByRule({ row, skipRule })
      ? { ...row, status: "skipped" as const, skipReason: skipRule.reason }
      : row,
  );
}

/** Payments and refunds, counted separately because they cannot be restored. */
export function countAutoSkipped(rows: Pick<ImportRow, "status" | "skipReason">[]): number {
  return rows.filter((row) => row.status === "skipped" && !isRestorableSkip(row)).length;
}

export function sortSkipRules(skipRules: SkipRule[]): SkipRule[] {
  return [...skipRules].sort((a, b) => a.merchantKey.localeCompare(b.merchantKey));
}
