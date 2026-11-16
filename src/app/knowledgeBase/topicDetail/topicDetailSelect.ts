import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectDocs = (state: AppState) => state.topicDetail.docs;

const selectDocsByKey = createSelector([selectDocs], (docs) => {
  return new Map(docs.map((doc) => [doc.detailKey, doc]));
});

export const topicDetailSelect = {
  docs: selectDocs,
  docsByKey: selectDocsByKey,
};
