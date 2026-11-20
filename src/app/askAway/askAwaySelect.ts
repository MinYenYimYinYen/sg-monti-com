import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import { latestContextTokens, sumConversationTotals } from "@/app/anthropic/anthropicLogic";
import { knowledgeBaseSelect } from "@/app/knowledgeBase/editor/knowledgeBaseSelect";
import { resolveDetails } from "@/app/knowledgeBase/topicDetail/topicDetailLogic";

const selectSessionId = (state: AppState) => state.askAway.sessionId;
const selectTurns = (state: AppState) => state.askAway.turns;
const selectPendingText = (state: AppState) => state.askAway.pendingText;
const selectCurrentTopicKeys = (state: AppState) => state.askAway.currentTopicKeys;

/** For O(1) "is this topic marked?" checks while rendering the topic list. */
const selectCurrentTopicKeySet = createSelector([selectCurrentTopicKeys], (currentTopicKeys) => {
  return new Set(currentTopicKeys);
});

/**
 * The documents that apply, general to specific. Not grouped by topic: a document tagged
 * `[pricing, sales]` is a backlink of `sales` but only applies once `pricing` is marked as well, and
 * `resolveDetails` is the rule that says so. Each document appears once, as its live (latest approved)
 * version: an edit that is still waiting for approval is never shown here or sent to Claude.
 */
const selectCurrentDetails = createSelector(
  [selectCurrentTopicKeys, knowledgeBaseSelect.liveDetails],
  (matchedTopicKeys, details) => resolveDetails({ matchedTopicKeys, details }),
);

const selectTotals = createSelector([selectTurns], (turns) => sumConversationTotals(turns));
const selectContextTokens = createSelector([selectTurns], (turns) => latestContextTokens(turns));

/**
 * Documents whose latest version is still waiting for approval. The panel shows the live version, so
 * for these the author is working on something newer than what Claude was sent.
 */
const selectPendingDetailKeySet = createSelector([knowledgeBaseSelect.details], (details) => {
  return new Set(details.filter((detail) => detail.status === "pending").map((detail) => detail.detailKey));
});

export const askAwaySelect = {
  sessionId: selectSessionId,
  turns: selectTurns,
  pendingText: selectPendingText,
  currentTopicKeys: selectCurrentTopicKeys,
  currentTopicKeySet: selectCurrentTopicKeySet,
  currentDetails: selectCurrentDetails,
  pendingDetailKeySet: selectPendingDetailKeySet,
  totals: selectTotals,
  contextTokens: selectContextTokens,
};
