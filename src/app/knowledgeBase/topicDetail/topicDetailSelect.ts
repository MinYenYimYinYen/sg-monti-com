import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { pickHeadDocs, pickLiveDocs } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

const selectCurrentDocs = (state: AppState) => state.topicDetail.docs;
const selectHistoryByDetailKey = (state: AppState) => state.topicDetail.historyByDetailKey;

/** The head of every document: what editors and reviewers work on. One row per document. */
const selectHeadDocs = createSelector([selectCurrentDocs], (docs) => pickHeadDocs(docs));

/**
 * The live (latest approved) version of every document that has one. This is the only set the AI
 * reads. A document that has never been approved is not in it.
 */
const selectLiveDocs = createSelector([selectCurrentDocs], (docs) => pickLiveDocs(docs));

const selectHeadDocsByKey = createSelector([selectHeadDocs], (docs) => {
  return new Map(docs.map((doc) => [doc.detailKey, doc]));
});

const selectLiveDocsByKey = createSelector([selectLiveDocs], (docs) => {
  return new Map(docs.map((doc) => [doc.detailKey, doc]));
});

export const topicDetailSelect = {
  currentDocs: selectCurrentDocs,
  headDocs: selectHeadDocs,
  headDocsByKey: selectHeadDocsByKey,
  liveDocs: selectLiveDocs,
  liveDocsByKey: selectLiveDocsByKey,
  historyByDetailKey: selectHistoryByDetailKey,
};
