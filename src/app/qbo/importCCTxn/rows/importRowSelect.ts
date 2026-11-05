import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectOpenRows = (state: AppState) => state.importRow.openRows;
const selectFile = (state: AppState) => state.importRow.file;
const selectPreview = (state: AppState) => state.importRow.preview;
const selectConfirmedDuplicateRowNumbers = (state: AppState) =>
  state.importRow.confirmedDuplicateRowNumbers;
const selectCommitStatus = (state: AppState) => state.importRow.commitStatus;
const selectLastCommit = (state: AppState) => state.importRow.lastCommit;

const selectPendingRows = createSelector([selectOpenRows], (openRows) =>
  openRows.filter((row) => row.status === "pending"),
);

const selectSkippedRows = createSelector([selectOpenRows], (openRows) =>
  openRows.filter((row) => row.status === "skipped"),
);

const selectRowsNeedingAttention = createSelector([selectOpenRows], (openRows) =>
  openRows.filter((row) => row.status === "failed" || row.status === "unknown"),
);

/** Rows that may be posted: pending, or failed (certain not to be in QuickBooks). */
const selectPostableRows = createSelector([selectOpenRows], (openRows) =>
  openRows.filter((row) => row.status === "pending" || row.status === "failed"),
);

const selectUnknownRows = createSelector([selectOpenRows], (openRows) =>
  openRows.filter((row) => row.status === "unknown" || row.status === "posting"),
);

const selectPendingRowsByMerchantKey = createSelector([selectPendingRows], (pendingRows) =>
  new Grouper(pendingRows).groupBy((row) => row.merchantKey).toMap(),
);

const selectConfirmedDuplicateRowNumberSet = createSelector(
  [selectConfirmedDuplicateRowNumbers],
  (rowNumbers) => new Set(rowNumbers),
);

export const importRowSelect = {
  openRows: selectOpenRows,
  pendingRows: selectPendingRows,
  skippedRows: selectSkippedRows,
  rowsNeedingAttention: selectRowsNeedingAttention,
  postableRows: selectPostableRows,
  unknownRows: selectUnknownRows,
  pendingRowsByMerchantKey: selectPendingRowsByMerchantKey,
  file: selectFile,
  preview: selectPreview,
  confirmedDuplicateRowNumbers: selectConfirmedDuplicateRowNumbers,
  confirmedDuplicateRowNumberSet: selectConfirmedDuplicateRowNumberSet,
  commitStatus: selectCommitStatus,
  lastCommit: selectLastCommit,
};
