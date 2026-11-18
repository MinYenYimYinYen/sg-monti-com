import { createSelector } from "@reduxjs/toolkit";
import type { AppState } from "@/store";
import { sumConversationTotals } from "@/app/anthropic/anthropicLogic";
import type { ConversationTotals } from "@/app/anthropic/AnthropicTypes";
import { groupChatTurnsBySessionId, sortSessionsNewestFirst } from "@/app/claudeSession/claudeSessionLogic";

const selectSessionDocs = (state: AppState) => state.claudeSession.sessionDocs;
const selectTurnDocs = (state: AppState) => state.claudeSession.turnDocs;

const selectSessions = createSelector([selectSessionDocs], (sessionDocs) => sortSessionsNewestFirst(sessionDocs));

const selectSessionsById = createSelector([selectSessionDocs], (sessionDocs) => {
  return new Map(sessionDocs.map((doc) => [doc.sessionId, doc]));
});

/** Each session's turns in the shape the Anthropic helpers use, oldest first. */
const selectChatTurnsBySessionId = createSelector([selectTurnDocs], (turnDocs) => groupChatTurnsBySessionId(turnDocs));

const selectTotalsBySessionId = createSelector([selectChatTurnsBySessionId], (chatTurnsBySessionId) => {
  const totalsBySessionId = new Map<string, ConversationTotals>();
  for (const [sessionId, chatTurns] of chatTurnsBySessionId) {
    totalsBySessionId.set(sessionId, sumConversationTotals(chatTurns));
  }
  return totalsBySessionId;
});

export const claudeSessionSelect = {
  sessions: selectSessions,
  sessionsById: selectSessionsById,
  chatTurnsBySessionId: selectChatTurnsBySessionId,
  /** Totals summed from the turns in state, for a live conversation. Stored sessions carry their own. */
  totalsBySessionId: selectTotalsBySessionId,
};
