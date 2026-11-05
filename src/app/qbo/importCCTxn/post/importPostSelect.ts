import { AppState } from "@/store";

import { createSelector } from "@reduxjs/toolkit";
import { summarizeRun } from "@/app/qbo/importCCTxn/_lib/importBatchRunUtils";

const selectPreview = (state: AppState) => state.importPost.preview;
const selectBatchPreview = (state: AppState) => state.importPost.batchPreview;
const selectLastRun = (state: AppState) => state.importPost.lastRun;

const selectLastRunSummary = createSelector([selectLastRun], (lastRun) =>
  lastRun ? summarizeRun(lastRun) : null,
);

export const importPostSelect = {
  preview: selectPreview,
  batchPreview: selectBatchPreview,
  lastRun: selectLastRun,
  lastRunSummary: selectLastRunSummary,
};
