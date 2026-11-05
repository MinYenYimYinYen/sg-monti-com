import { MerchantMapping } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  DecisionDraft,
  DecisionViews,
  MappingDecision,
  RowAccountDecision,
  SaveDecisionsParams,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";
import { collapseDescription } from "@/app/qbo/importCCTxn/_lib/importMerchantKey";
import { groupRowsIntoFamilies, liveDraft } from "@/app/qbo/importCCTxn/_lib/importDecisionFamilyUtils";

// Turns the draft into the one batch a Save sends. Only rows that are not skipped make decisions.

export const emptySavePayload: SaveDecisionsParams = {
  mappingDecisions: [],
  rowAccountDecisions: [],
  skippedRowIds: [],
  skipRuleMerchantKeys: [],
};

export function isSavePayloadEmpty(payload: SaveDecisionsParams): boolean {
  return (
    payload.mappingDecisions.length === 0 &&
    payload.rowAccountDecisions.length === 0 &&
    payload.skippedRowIds.length === 0 &&
    payload.skipRuleMerchantKeys.length === 0
  );
}

/**
 * The descriptions a person looked at: rows whose own vendor pick is the family's vendor, and
 * inferred rows they ticked. The server adds them to the saved list, or starts the list over
 * when the vendor changed.
 */
function collectConfirmedDescriptions({
  rows,
  vendorId,
  live,
}: {
  rows: ImportRow[];
  vendorId: string;
  live: DecisionDraft;
}): string[] {
  const descriptions = new Set<string>();
  for (const row of rows) {
    const isOwnPick = live.vendorPicks.some(
      (pick) => pick.rowId === row.rowId && pick.vendorId === vendorId,
    );
    const isTicked = live.confirmedRows.some(
      (confirmed) => confirmed.rowId === row.rowId && confirmed.vendorId === vendorId,
    );
    if (isOwnPick || isTicked) descriptions.add(collapseDescription(row.description));
  }
  return [...descriptions];
}

function buildMappingDecisions({
  pendingRows,
  merchantMappingMap,
  draft,
  views,
}: {
  pendingRows: ImportRow[];
  merchantMappingMap: Map<string, MerchantMapping>;
  draft: DecisionDraft;
  views: DecisionViews;
}): MappingDecision[] {
  const live = liveDraft(draft);
  const mappingDecisions: MappingDecision[] = [];

  for (const family of groupRowsIntoFamilies({ pendingRows, merchantMappingMap })) {
    const familyView = views.familyViews.get(family.merchantKey);
    if (!familyView || familyView.isAlwaysSkip) continue;
    if (familyView.vendorId === null || familyView.defaultAccountId === null) continue;

    const liveRows = family.rows.filter((row) => !draft.skippedRowIds.includes(row.rowId));
    if (liveRows.length === 0) continue;

    const confirmedDescriptions = collectConfirmedDescriptions({
      rows: liveRows,
      vendorId: familyView.vendorId,
      live,
    });
    const hasChange =
      familyView.isVendorFromDraft ||
      familyView.isDefaultAccountFromDraft ||
      confirmedDescriptions.length > 0;
    if (!hasChange) continue;

    mappingDecisions.push({
      merchantKey: family.merchantKey,
      vendorId: familyView.vendorId,
      defaultAccountId: familyView.defaultAccountId,
      confirmedDescriptions,
    });
  }
  return mappingDecisions;
}

/**
 * A row's own account is stored only when it differs from the family default. Picking the
 * default again clears an account the row had saved before.
 */
function buildRowAccountDecisions({
  pendingRows,
  draft,
  views,
}: {
  pendingRows: ImportRow[];
  draft: DecisionDraft;
  views: DecisionViews;
}): RowAccountDecision[] {
  const live = liveDraft(draft);
  const rowsById = new Map(pendingRows.map((row) => [row.rowId, row]));
  const decisions: RowAccountDecision[] = [];

  for (const pick of live.accountPicks) {
    const row = rowsById.get(pick.rowId);
    const familyView = views.familyViews.get(pick.merchantKey);
    if (!row || !familyView) continue;

    if (pick.accountId === familyView.defaultAccountId) {
      if (row.accountId) decisions.push({ rowId: row.rowId, accountId: null });
    } else if (pick.accountId !== row.accountId) {
      decisions.push({ rowId: row.rowId, accountId: pick.accountId });
    }
  }
  return decisions;
}

export function buildSavePayload({
  pendingRows,
  merchantMappingMap,
  draft,
  views,
}: {
  pendingRows: ImportRow[];
  merchantMappingMap: Map<string, MerchantMapping>;
  draft: DecisionDraft;
  views: DecisionViews;
}): SaveDecisionsParams {
  const pendingRowIds = new Set(pendingRows.map((row) => row.rowId));
  const alwaysSkipKeys = new Set(draft.alwaysSkipMerchantKeys);
  const pendingKeys = new Set(pendingRows.map((row) => row.merchantKey));

  return {
    mappingDecisions: buildMappingDecisions({ pendingRows, merchantMappingMap, draft, views }),
    rowAccountDecisions: buildRowAccountDecisions({ pendingRows, draft, views }),
    // A family that is always skipped needs no row-by-row skips: its rule covers every row.
    skippedRowIds: draft.skippedRowIds.filter((rowId) => {
      if (!pendingRowIds.has(rowId)) return false;
      const row = pendingRows.find((pendingRow) => pendingRow.rowId === rowId);
      return row ? !alwaysSkipKeys.has(row.merchantKey) : false;
    }),
    skipRuleMerchantKeys: draft.alwaysSkipMerchantKeys.filter((key) => pendingKeys.has(key)),
  };
}
