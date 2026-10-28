import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectDocs = (state: AppState) => state.topic.docs;

const selectDocsByKey = createSelector([selectDocs], (docs) => {
  return new Map(docs.map((doc) => [doc.topicKey, doc]));
});

/** What the classifier is allowed to see: keys and descriptions only. */
const selectClassifierCandidates = createSelector([selectDocs], (docs) => {
  return docs.map((doc) => ({ topicKey: doc.topicKey, description: doc.description }));
});

export const topicSelect = {
  docs: selectDocs,
  docsByKey: selectDocsByKey,
  classifierCandidates: selectClassifierCandidates,
};
