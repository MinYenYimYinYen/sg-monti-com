import { createSelector } from "@reduxjs/toolkit";
import { authSelect } from "@/app/auth/authSlice";
import { topicSelect } from "@/app/knowledgeBase/topic/topicSelect";
import { topicDetailSelect } from "@/app/knowledgeBase/topicDetail/topicDetailSelect";
import { knowledgeBaseSettingsSelect } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSelect";
import {
  attachApprovalToDetails,
  attachDocumentsToTopics,
  attachTopicsToDetails,
  orderTopicsByCoverage,
} from "@/app/knowledgeBase/editor/knowledgeBaseLogic";

/** Topics with their backlinks: the documents tagged with each, counted once however many versions they have. */
const selectTopicsWithDocuments = createSelector(
  [topicSelect.docs, topicDetailSelect.headDocs],
  (topics, details) => attachDocumentsToTopics({ topics, details }),
);

/** The same topics, documented ones first and undocumented ones last, for the Topics tab only. Pickers stay alphabetical. */
const selectTopicsByCoverage = createSelector([selectTopicsWithDocuments], (topics) => orderTopicsByCoverage(topics));

/** Topics no document is tagged with: the authoring to-do list. Alphabetical by name. */
const selectTopicsWithoutDetails = createSelector([selectTopicsWithDocuments], (topics) =>
  topics.filter((topic) => topic.documents.length === 0),
);

const selectHeadDetailsWithTopics = createSelector(
  [topicSelect.docs, topicDetailSelect.headDocs],
  (topics, details) => attachTopicsToDetails({ topics, details }),
);

/** Each document's head with its topics and approval state resolved. This is what editors and reviewers see. */
const selectDetailsWithTopics = createSelector(
  [selectHeadDetailsWithTopics, topicDetailSelect.liveDocs, knowledgeBaseSettingsSelect.approverUserNames],
  (details, liveDocs, approverUserNames) => attachApprovalToDetails({ details, liveDocs, approverUserNames }),
);

/** Heads still waiting on the signed-in user: they are a current approver who has not approved yet. */
const selectDetailsPendingMyApproval = createSelector([selectDetailsWithTopics, authSelect.user], (details, user) => {
  if (!user) return [];
  return details.filter((detail) => detail.pendingApproverUserNames.includes(user.userName));
});

/**
 * Each document's live (latest approved) version with its topics resolved. The AI reads only these,
 * so an edit that has not been approved yet never reaches it.
 */
const selectLiveDetailsWithTopics = createSelector(
  [topicSelect.docs, topicDetailSelect.liveDocs],
  (topics, details) => attachTopicsToDetails({ topics, details }),
);

export const knowledgeBaseSelect = {
  topics: selectTopicsWithDocuments,
  topicsByCoverage: selectTopicsByCoverage,
  topicsWithoutDetails: selectTopicsWithoutDetails,
  details: selectDetailsWithTopics,
  detailsPendingMyApproval: selectDetailsPendingMyApproval,
  liveDetails: selectLiveDetailsWithTopics,
};
