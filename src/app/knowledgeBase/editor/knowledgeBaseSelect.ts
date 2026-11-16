import { createSelector } from "@reduxjs/toolkit";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { attachDocumentsToTopics, attachTopicsToDetails } from "@/app/knowledgeBase/editor/knowledgeBaseLogic";

/** Topics with their backlinks: the documents tagged with each. */
const selectTopicsWithDocuments = createSelector(
  [topicSelect.docs, topicDetailSelect.docs],
  (topics, details) => attachDocumentsToTopics({ topics, details }),
);

/** Documents with their topics resolved. */
const selectDetailsWithTopics = createSelector(
  [topicSelect.docs, topicDetailSelect.docs],
  (topics, details) => attachTopicsToDetails({ topics, details }),
);

export const knowledgeBaseSelect = {
  topics: selectTopicsWithDocuments,
  details: selectDetailsWithTopics,
};
