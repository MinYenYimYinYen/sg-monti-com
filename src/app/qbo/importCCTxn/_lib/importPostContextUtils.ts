import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import {
  CardAssignment,
  FormatAccount,
  MerchantMapping,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { QboPurchaseCreate } from "@/app/qbo/purchase/types/QboPurchaseTypes";
import { BlockedRow, ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  buildPurchaseCreate,
  checkRowReadyToPost,
  PostCheckInput,
} from "@/app/qbo/importCCTxn/_lib/importPostUtils";
import { BatchCandidate, toBlockedRow } from "@/app/qbo/importCCTxn/_lib/importBatchPlanUtils";
import { cardAssignmentKey, resolveCardAccountId } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";
import { resolveRowAccountId } from "@/app/qbo/importCCTxn/_lib/importAccountUtils";
import { buildMerchantKey, collapseDescription } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";

// Everything a posting run reads, loaded once (see loadPostContext). Checking a row against it
// is plain logic with no network calls, so a month of rows does not mean a month of lookups.

export type PostContext = {
  /** Mappings that apply to everyone, by merchant key. */
  mappingMap: Map<string, MerchantMapping>;
  cardAssignmentMap: Map<string, CardAssignment>;
  formatAccountMap: Map<string, FormatAccount>;
  /** Every QuickBooks vendor, inactive ones included, by Id. */
  vendorMap: Map<string, QboVendorSummary>;
  /** Every QuickBooks account, inactive ones included, by Id. */
  accountMap: Map<string, QboAccount>;
  /** YYYY-MM-DD from Preferences, or null when not set. */
  bookCloseDate: string | null;
};

/**
 * What the pre-flight needs for one row. The merchant key comes from the description by the
 * current rules, not from the stored key, which could be out of date. The row's own account wins
 * over the merchant's default.
 */
export function assembleCheckInput({
  row,
  context,
}: {
  row: ImportRow;
  context: PostContext;
}): PostCheckInput {
  const mapping = context.mappingMap.get(buildMerchantKey(row.description)) ?? null;
  const cardAccountId = resolveCardAccountId({
    cardAssignment: context.cardAssignmentMap.get(cardAssignmentKey(row)),
    formatAccount: context.formatAccountMap.get(row.formatId),
  });
  const expenseAccountId = resolveRowAccountId({ rowAccountId: row.accountId, mapping });

  return {
    row,
    mapping,
    vendor: mapping ? (context.vendorMap.get(mapping.vendorId) ?? null) : null,
    expenseAccount: expenseAccountId ? (context.accountMap.get(expenseAccountId) ?? null) : null,
    cardAccount: cardAccountId ? (context.accountMap.get(cardAccountId) ?? null) : null,
    bookCloseDate: context.bookCloseDate,
  };
}

/** A row that passed the pre-flight, with the purchase to send for it. */
export type ReadyRow = {
  row: ImportRow;
  purchase: QboPurchaseCreate;
  mapping: MerchantMapping | null;
  expenseAccountId: string;
};

/**
 * Checks every requested row against the context and splits them into rows that can be sent and
 * rows that cannot, with why. The ready rows keep the order they were asked for. A row that is
 * missing, not postable, unmapped, or pointing at something inactive is blocked, never sent.
 */
export function planPostRows({
  rowIds,
  rowMap,
  context,
}: {
  rowIds: string[];
  rowMap: Map<string, ImportRow>;
  context: PostContext;
}): { readyRows: ReadyRow[]; blockedRows: BlockedRow[] } {
  const readyRows: ReadyRow[] = [];
  const blockedRows: BlockedRow[] = [];

  for (const rowId of rowIds) {
    const row = rowMap.get(rowId);
    if (!row) {
      blockedRows.push({
        rowId,
        description: rowId,
        transactionDate: "",
        amountCents: 0,
        problems: ["That row no longer exists."],
      });
      continue;
    }

    const input = assembleCheckInput({ row, context });
    const check = checkRowReadyToPost(input);
    if (check.problems.length > 0 || !input.vendor || !input.expenseAccount || !input.cardAccount) {
      // The three missing-object cases already add a problem, so the message is never empty.
      blockedRows.push(toBlockedRow({ row, problems: check.problems }));
      continue;
    }

    readyRows.push({
      row,
      mapping: input.mapping,
      expenseAccountId: input.expenseAccount.Id,
      purchase: buildPurchaseCreate({
        row,
        vendor: input.vendor,
        expenseAccount: input.expenseAccount,
        cardAccount: input.cardAccount,
      }),
    });
  }

  return { readyRows, blockedRows };
}
/**
 * Every row in a range with what the pre-flight says about it, for the preview. A row is
 * confirmed when its own description is listed on its merchant's mapping.
 */
export function buildCandidates({
  rows,
  context,
}: {
  rows: ImportRow[];
  context: PostContext;
}): BatchCandidate[] {
  return rows.map((row) => {
    const input = assembleCheckInput({ row, context });
    const check = checkRowReadyToPost(input);
    const confirmedDescriptions = input.mapping?.confirmedMerchants ?? [];
    return {
      row,
      problems: check.problems,
      warnings: check.warnings,
      isConfirmed: confirmedDescriptions.includes(collapseDescription(row.description)),
    };
  });
}