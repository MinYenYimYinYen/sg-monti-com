import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import {
  countPostingsByStatus,
  pickPostingsNeedingAttention,
} from "@/app/qbo/journalEntry/_lib/qboJournalEntryStateUtils";

const selectPostings = (state: AppState) => state.qboJournalEntry.journalEntryPostings;
const selectLoadedRange = (state: AppState) => state.qboJournalEntry.loadedRange;
const selectLastPostRun = (state: AppState) => state.qboJournalEntry.lastPostRun;

const selectPostingMap = createSelector([selectPostings], (postings) =>
  new Grouper(postings).toUniqueMap((posting) => posting.docNumber),
);

const selectPostingCounts = createSelector([selectPostings], countPostingsByStatus);

const selectPostingsNeedingAttention = createSelector(
  [selectPostings],
  pickPostingsNeedingAttention,
);

export const qboJournalEntrySelect = {
  postings: selectPostings,
  loadedRange: selectLoadedRange,
  lastPostRun: selectLastPostRun,
  postingMap: selectPostingMap,
  postingCounts: selectPostingCounts,
  postingsNeedingAttention: selectPostingsNeedingAttention,
};
