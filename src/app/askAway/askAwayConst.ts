import type { AnthropicModelId } from "@/app/anthropic/anthropicConst";

/** Haiku, on purpose and with no picker: the answers come from documents, so the cheapest model is enough to try. */
export const ASK_AWAY_MODEL: AnthropicModelId = "claude-haiku-5-5";

/** Stored on every saved session, so conversations from different features can share `claudeSession`. */
export const ASK_AWAY_SESSION_KIND = "askAway";

export const MARK_TOPICS_TOOL_NAME = "markTopicsRelevant";

export const MAX_TOPICS_PER_CALL = 20;
