import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboVendorSummary } from "@/app/qbo/vendor/types/QboVendorTypes";
import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  DecisionDraft,
  DecisionViews,
  FamilyDecisionView,
  RowDecisionView,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";
import { collapseDescription } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";
import {
  buildFamilyView,
  describeAccountProblem,
  describeVendorProblem,
  groupRowsIntoFamilies,
  liveDraft,
  resolveAccount,
  resolveVendor,
} from "@/app/qbo/importCCTxn/_lib/importDecisionFamilyUtils";

// Pure logic behind the Map tab's row selector: what each pending row shows, given the saved
// mappings and the unsaved draft. Nothing here reads a store.

function findProblem({
  vendorId,
  accountId,
  vendorMap,
  accountMap,
}: {
  vendorId: string;
  accountId: string;
  vendorMap: Map<string, QboVendorSummary>;
  accountMap: Map<string, QboAccount>;
}): string | null {
  const vendorProblem = vendorId ? describeVendorProblem({ vendorId, vendorMap }) : null;
  if (vendorProblem) return vendorProblem;
  return accountId ? describeAccountProblem({ accountId, accountMap }) : null;
}

function buildRowView({
  row,
  family,
  mapping,
  draft,
  live,
  vendorMap,
  accountMap,
}: {
  row: ImportRow;
  family: FamilyDecisionView;
  mapping: MerchantMapping | null;
  draft: DecisionDraft;
  live: DecisionDraft;
  vendorMap: Map<string, QboVendorSummary>;
  accountMap: Map<string, QboAccount>;
}): RowDecisionView {
  const isRowSkipped = draft.skippedRowIds.includes(row.rowId);
  const isSkipped = isRowSkipped || family.isAlwaysSkip;

  const vendor = resolveVendor({ row, family, live });
  const account = resolveAccount({ row, family, live });

  const isStoredConfirmed = mapping?.confirmedMerchants?.includes(collapseDescription(row.description)) ?? false;
  const isDraftConfirmed = live.confirmedRows.some(
    (confirmed) => confirmed.rowId === row.rowId && confirmed.vendorId === vendor.vendorId,
  );

  // A saved vendor the family still uses needs a tick until this exact description is confirmed.
  const canConfirmVendor =
    vendor.source === "inferred" || (vendor.source === "stored" && !isStoredConfirmed);
  const isVendorConfirmed = canConfirmVendor && isDraftConfirmed;

  const ownVendorPick = live.vendorPicks.find((pick) => pick.rowId === row.rowId);
  const problem = isSkipped
    ? null
    : findProblem({
        vendorId: vendor.vendorId,
        accountId: account.accountId,
        vendorMap,
        accountMap,
      });

  return {
    rowId: row.rowId,
    merchantKey: row.merchantKey,
    vendorId: vendor.vendorId,
    vendorSource: vendor.source,
    storedVendorId: mapping?.vendorId ?? "",
    accountId: account.accountId,
    accountSource: account.source,
    canConfirmVendor: canConfirmVendor && !isSkipped,
    isVendorConfirmed,
    needsConfirmation: canConfirmVendor && !isVendorConfirmed && !isSkipped,
    replacesStoredVendor:
      ownVendorPick !== undefined && mapping !== null && mapping.vendorId !== ownVendorPick.vendorId,
    isAccountInferred: account.source === "inferred" && !isSkipped,
    isDefaultAccountWorthALook:
      account.source === "stored" &&
      !row.accountId &&
      !isSkipped &&
      (mapping?.otherAccountIds.length ?? 0) > 0,
    isSkipped,
    skipSource: family.isAlwaysSkip ? "rule" : isRowSkipped ? "row" : "none",
    isAlwaysSkip: family.isAlwaysSkip,
    familyPendingCount: family.pendingCount,
    isReady: isSkipped || (vendor.vendorId !== "" && account.accountId !== "" && problem === null),
    problem,
  };
}

/**
 * A view per pending row and per merchant family. It is recomputed whenever the draft, the rows
 * or the saved mappings change, which is what makes a pick show up on sibling rows at once.
 */
export function buildDecisionViews({
  pendingRows,
  draft,
  merchantMappingMap,
  vendorMap,
  accountMap,
}: {
  pendingRows: ImportRow[];
  draft: DecisionDraft;
  merchantMappingMap: Map<string, MerchantMapping>;
  vendorMap: Map<string, QboVendorSummary>;
  accountMap: Map<string, QboAccount>;
}): DecisionViews {
  const alwaysSkipKeys = new Set(draft.alwaysSkipMerchantKeys);
  const live = liveDraft(draft);

  const rowViews = new Map<string, RowDecisionView>();
  const familyViews = new Map<string, FamilyDecisionView>();

  for (const family of groupRowsIntoFamilies({ pendingRows, merchantMappingMap })) {
    const familyView = buildFamilyView({
      family,
      live,
      isAlwaysSkip: alwaysSkipKeys.has(family.merchantKey),
    });
    familyViews.set(family.merchantKey, familyView);
    for (const row of family.rows) {
      rowViews.set(
        row.rowId,
        buildRowView({
          row,
          family: familyView,
          mapping: family.mapping,
          draft,
          live,
          vendorMap,
          accountMap,
        }),
      );
    }
  }

  return { rowViews, familyViews };
}

/** Row ids in display order: families together, then by date, so siblings sit next to each other. */
export function sortRowIdsForDisplay(pendingRows: ImportRow[]): string[] {
  return [...pendingRows]
    .sort(
      (a, b) =>
        a.merchantKey.localeCompare(b.merchantKey) ||
        a.transactionDate.localeCompare(b.transactionDate) ||
        a.rowId.localeCompare(b.rowId),
    )
    .map((row) => row.rowId);
}

export type DecisionProgress = {
  totalRowCount: number;
  readyRowCount: number;
  notReadyRowCount: number;
};

export function summarizeProgress(rowViews: Map<string, RowDecisionView>): DecisionProgress {
  let readyRowCount = 0;
  for (const view of rowViews.values()) if (view.isReady) readyRowCount += 1;
  return {
    totalRowCount: rowViews.size,
    readyRowCount,
    notReadyRowCount: rowViews.size - readyRowCount,
  };
}
