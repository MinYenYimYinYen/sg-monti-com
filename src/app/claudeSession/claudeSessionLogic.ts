import { extractText } from "@/app/anthropic/anthropicLogic";
import type { ChatMessage, ChatTurn, ConversationTotals, TurnStats } from "@/app/anthropic/AnthropicTypes";
import { SESSION_TITLE_MAX_CHARS, UNTITLED_SESSION_TITLE } from "@/app/claudeSession/claudeSessionConst";
import type { ClaudeSessionDoc, ClaudeSessionTurnDoc } from "@/app/claudeSession/ClaudeSessionTypes";

/** The first prompt, on one line and cut short, so the session list has something to show. */
export function buildSessionTitle(prompt: ChatMessage): string {
  const oneLine = extractText(prompt.content).replace(/\s+/g, " ").trim();
  if (oneLine === "") return UNTITLED_SESSION_TITLE;
  if (oneLine.length <= SESSION_TITLE_MAX_CHARS) return oneLine;
  return `${oneLine.slice(0, SESSION_TITLE_MAX_CHARS - 1).trimEnd()}…`;
}

/** What one turn adds to its session's totals. A turn that failed before any call adds nothing. */
export function buildTotalsIncrement(stats: TurnStats | null): ConversationTotals {
  if (stats === null) return { apiCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  return {
    apiCalls: stats.apiCalls,
    inputTokens: stats.inputTokens,
    outputTokens: stats.outputTokens,
    costUsd: stats.costUsd,
  };
}

/** MongoDB's duplicate key error, which here means a session id that another user already holds. */
export function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === 11000;
}

export function sortSessionsNewestFirst(sessions: ClaudeSessionDoc[]): ClaudeSessionDoc[] {
  return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Replaces the session with the same id, or adds it. */
export function upsertSessionDoc({
  sessionDocs,
  updated,
}: {
  sessionDocs: ClaudeSessionDoc[];
  updated: ClaudeSessionDoc;
}): ClaudeSessionDoc[] {
  const exists = sessionDocs.some((doc) => doc.sessionId === updated.sessionId);
  if (!exists) return [...sessionDocs, updated];
  return sessionDocs.map((doc) => (doc.sessionId === updated.sessionId ? updated : doc));
}

/** Merges turns in by session and index, so loading a session twice never duplicates a turn. */
export function mergeTurnDocs({
  existing,
  incoming,
}: {
  existing: ClaudeSessionTurnDoc[];
  incoming: ClaudeSessionTurnDoc[];
}): ClaudeSessionTurnDoc[] {
  if (incoming.length === 0) return existing;
  const turnDocsByKey = new Map(existing.map((doc) => [`${doc.sessionId}:${doc.turnIndex}`, doc]));
  for (const doc of incoming) {
    turnDocsByKey.set(`${doc.sessionId}:${doc.turnIndex}`, doc);
  }
  return Array.from(turnDocsByKey.values());
}

/**
 * True when every turn the session holds is already in state. A session that was just continued
 * has its newest turn in state but not the older ones, so counting is what tells the two apart.
 * A session that is not in state at all has not been loaded.
 */
export function hasLoadedAllTurns({
  sessionDocs,
  turnDocs,
  sessionId,
}: {
  sessionDocs: ClaudeSessionDoc[];
  turnDocs: ClaudeSessionTurnDoc[];
  sessionId: string;
}): boolean {
  const sessionDoc = sessionDocs.find((doc) => doc.sessionId === sessionId);
  if (!sessionDoc) return false;
  const loadedCount = turnDocs.filter((doc) => doc.sessionId === sessionId).length;
  return loadedCount >= sessionDoc.turnCount;
}

export function toChatTurn(turnDoc: ClaudeSessionTurnDoc): ChatTurn {
  const { prompt, replies, stats, notice } = turnDoc;
  return { prompt, replies, stats, notice };
}

/** Each session's turns as the Anthropic helpers want them, oldest first. */
export function groupChatTurnsBySessionId(turnDocs: ClaudeSessionTurnDoc[]): Map<string, ChatTurn[]> {
  const chatTurnsBySessionId = new Map<string, ChatTurn[]>();
  for (const turnDoc of [...turnDocs].sort((a, b) => a.turnIndex - b.turnIndex)) {
    const chatTurns = chatTurnsBySessionId.get(turnDoc.sessionId) ?? [];
    chatTurns.push(toChatTurn(turnDoc));
    chatTurnsBySessionId.set(turnDoc.sessionId, chatTurns);
  }
  return chatTurnsBySessionId;
}
