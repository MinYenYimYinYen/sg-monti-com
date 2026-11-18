import {
  ALLOWED_MODELS,
  DEFAULT_MODEL,
  MAX_TOOL_RESULT_CHARS,
  type AnthropicModelId,
} from "@/app/anthropic/anthropicConst";
import { computeTotalCost } from "@/app/anthropic/anthropicPricing";
import type {
  AnthropicStopReason,
  ChatMessage,
  ChatTurn,
  ContentBlock,
  ConversationTotals,
  TextBlock,
  TokenUsage,
  ToolResultBlock,
  ToolUseBlock,
  TurnStats,
} from "@/app/anthropic/AnthropicTypes";

/** A select hands back a plain string; anything not on the allowlist falls back to the default. */
export function parseModelId(value: string): AnthropicModelId {
  return ALLOWED_MODELS.find((modelId) => modelId === value) ?? DEFAULT_MODEL;
}

/** What the next prompt will resend, from the latest turn that was kept in the history. */
export function latestContextTokens(turns: ChatTurn[]): number {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const { replies, stats } = turns[index];
    if (replies.length > 0 && stats !== null) return stats.contextTokens;
  }
  return 0;
}

export function findTextBlocks(blocks: ContentBlock[]): TextBlock[] {
  return blocks.filter((block): block is TextBlock => block.type === "text");
}

export function findToolUses(blocks: ContentBlock[]): ToolUseBlock[] {
  return blocks.filter((block): block is ToolUseBlock => block.type === "tool_use");
}

export function extractText(blocks: ContentBlock[]): string {
  return findTextBlocks(blocks)
    .map((block) => block.text)
    .join("\n\n");
}

export function sumUsage(usagePerCall: TokenUsage[]): TokenUsage {
  return usagePerCall.reduce(
    (total, usage) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
}

/** A tool can return a lot. The cap keeps one result from filling the next request. */
export function truncateToolResult(text: string): string {
  if (text.length === 0) return "(no output)";
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text;
  return `${text.slice(0, MAX_TOOL_RESULT_CHARS)}\n[truncated: ${text.length - MAX_TOOL_RESULT_CHARS} more characters]`;
}

export function buildToolResultMessage(results: ToolResultBlock[]): ChatMessage {
  return { role: "user", content: results };
}

/**
 * Keeps only a history that is safe to send again: it must end on an assistant message that has
 * answer text and no unanswered tool call. A reply cut off by an error, the iteration cap or a
 * token limit that was spent on thinking would otherwise make the next request invalid.
 */
export function trimToLastCompleteReply(replies: ChatMessage[]): ChatMessage[] {
  for (let index = replies.length - 1; index >= 0; index -= 1) {
    const { role, content } = replies[index];
    if (role === "assistant" && findToolUses(content).length === 0 && findTextBlocks(content).length > 0) {
      return replies.slice(0, index + 1);
    }
  }
  return [];
}

/** The conversation as the API wants it: every kept turn, oldest first. */
export function flattenConversation(turns: ChatTurn[]): ChatMessage[] {
  return turns.filter((turn) => turn.replies.length > 0).flatMap((turn) => [turn.prompt, ...turn.replies]);
}

export function buildTurnStats({
  model,
  usagePerCall,
}: {
  model: AnthropicModelId;
  usagePerCall: TokenUsage[];
}): TurnStats {
  const total = sumUsage(usagePerCall);
  const lastCall = usagePerCall[usagePerCall.length - 1];
  return {
    model,
    apiCalls: usagePerCall.length,
    inputTokens: total.inputTokens,
    outputTokens: total.outputTokens,
    costUsd: computeTotalCost({ model, usagePerCall }),
    // Input already includes the whole history, so the next prompt resends this plus the reply.
    contextTokens: lastCall ? lastCall.inputTokens + lastCall.outputTokens : 0,
  };
}

export function sumConversationTotals(turns: ChatTurn[]): ConversationTotals {
  return turns.reduce<ConversationTotals>(
    (totals, { stats }) =>
      stats === null
        ? totals
        : {
            apiCalls: totals.apiCalls + stats.apiCalls,
            inputTokens: totals.inputTokens + stats.inputTokens,
            outputTokens: totals.outputTokens + stats.outputTokens,
            costUsd: totals.costUsd + stats.costUsd,
          },
    { apiCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
  );
}

export function buildTurnNotice({
  stopReason,
  hitIterationCap,
  maxIterations,
  errorMessage,
  hasReply,
}: {
  stopReason: AnthropicStopReason | null;
  hitIterationCap: boolean;
  maxIterations: number;
  errorMessage: string | null;
  hasReply: boolean;
}): string | null {
  if (errorMessage !== null) return `The run failed part way: ${errorMessage}`;
  if (hitIterationCap) return `Stopped after ${maxIterations} model calls, the limit for one prompt.`;
  if (stopReason === "max_tokens") {
    return "The reply was cut off at the token limit. Thinking tokens count toward it, so a long internal think can leave little for the answer.";
  }
  if (stopReason === "refusal") return "The model declined to answer.";
  if (!hasReply) return "The model returned no answer text.";
  return null;
}
