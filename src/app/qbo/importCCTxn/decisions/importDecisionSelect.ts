import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { importRowSelect } from "@/app/qbo/importCCTxn/rows/importRowSelect";
import { hasDraftChanges } from "@/app/qbo/importCCTxn/_lib/importDecisionDraftUtils";
import {
  buildDecisionViews,
  sortRowIdsForDisplay,
  summarizeProgress,
} from "@/app/qbo/importCCTxn/_lib/importDecisionViewUtils";
import {
  buildSavePayload,
  isSavePayloadEmpty,
} from "@/app/qbo/importCCTxn/_lib/importDecisionSaveUtils";

// What the Map tab shows, derived from the draft, the pending rows and the saved mappings. A
// component reads one row's view with useSelector, so a pick anywhere re-renders only the rows
// whose view actually changed (compare with shallowEqual).

const selectDraft = (state: AppState) => state.importDecision.draft;
const selectSaveStatus = (state: AppState) => state.importDecision.saveStatus;
const selectSaveFailures = (state: AppState) => state.importDecision.saveFailures;

const selectViews = createSelector(
  [
    importRowSelect.pendingRows,
    selectDraft,
    importCCTxnMappingSelect.merchantMappingMap,
    qboVendorSelect.vendorMap,
    qboAccountSelect.accountMap,
  ],
  (pendingRows, draft, merchantMappingMap, vendorMap, accountMap) =>
    buildDecisionViews({ pendingRows, draft, merchantMappingMap, vendorMap, accountMap }),
);

const selectRowViewMap = createSelector([selectViews], (views) => views.rowViews);
const selectFamilyViewMap = createSelector([selectViews], (views) => views.familyViews);

/** The transaction itself (description, date, amount), by row id. */
const selectPendingRowMap = createSelector([importRowSelect.pendingRows], (pendingRows) =>
  new Grouper(pendingRows).toUniqueMap((row) => row.rowId),
);

const selectRowView = (state: AppState, rowId: string) => selectRowViewMap(state).get(rowId);
const selectPendingRow = (state: AppState, rowId: string) => selectPendingRowMap(state).get(rowId);

/** Row ids in display order. The list changes only when rows are added, removed or reordered. */
const selectDisplayRowIds = createSelector([importRowSelect.pendingRows], sortRowIdsForDisplay);

const selectProgress = createSelector([selectRowViewMap], summarizeProgress);

/** Rows skipped for this record only, in the draft. */
const selectSkippedRowIds = createSelector([selectDraft], (draft) => new Set(draft.skippedRowIds));

const selectSavePayload = createSelector(
  [
    importRowSelect.pendingRows,
    importCCTxnMappingSelect.merchantMappingMap,
    selectDraft,
    selectViews,
  ],
  (pendingRows, merchantMappingMap, draft, views) =>
    buildSavePayload({ pendingRows, merchantMappingMap, draft, views }),
);

const selectHasChanges = createSelector(
  [selectDraft],
  (draft) => hasDraftChanges(draft),
);

/** Save needs every pending row ready (skipped rows count) and something to save. */
const selectCanSave = createSelector(
  [selectProgress, selectSavePayload, selectHasChanges, selectSaveStatus],
  (progress, savePayload, hasChanges, saveStatus) =>
    hasChanges &&
    progress.notReadyRowCount === 0 &&
    !isSavePayloadEmpty(savePayload) &&
    saveStatus !== "pending",
);

export const importDecisionSelect = {
  draft: selectDraft,
  saveStatus: selectSaveStatus,
  saveFailures: selectSaveFailures,
  rowViewMap: selectRowViewMap,
  familyViewMap: selectFamilyViewMap,
  rowView: selectRowView,
  pendingRow: selectPendingRow,
  displayRowIds: selectDisplayRowIds,
  progress: selectProgress,
  skippedRowIds: selectSkippedRowIds,
  savePayload: selectSavePayload,
  hasChanges: selectHasChanges,
  canSave: selectCanSave,
};
