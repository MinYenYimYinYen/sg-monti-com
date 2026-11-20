import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectDocs = (state: AppState) => state.topic.docs;

const selectDocsByKey = createSelector([selectDocs], (docs) => {
  return new Map(docs.map((doc) => [doc.topicKey, doc]));
});

export const topicSelect = {
  docs: selectDocs,
  docsByKey: selectDocsByKey,
};
