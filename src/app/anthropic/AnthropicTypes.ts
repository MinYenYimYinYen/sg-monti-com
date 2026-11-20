import type { AnthropicModelId } from "@/app/anthropic/anthropicConst";

// These are this module's own types, not the SDK's, so client code never imports the SDK. Content
// blocks keep the API's snake_case field names because they are sent back to Anthropic verbatim
// (a thinking block's signature, for one, must come back unmodified).

export type TextBlock = { type: "text"; text: string };
export type ThinkingBlock = { type: "thinking"; thinking: string; signature: string };
export type RedactedThinkingBlock = { type: "redacted_thinking"; data: string };
export type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: unknown };
export type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export type ContentBlock = TextBlock | ThinkingBlock | RedactedThinkingBlock | ToolUseBlock | ToolResultBlock;

export type ChatMessage = { role: "user" | "assistant"; content: ContentBlock[] };

export type AnthropicStopReason =
  | "end_turn"
  | "max_tokens"
  | "stop_sequence"
  | "tool_use"
  | "pause_turn"
  | "refusal"
  | "model_context_window_exceeded";

export type TokenUsage = { inputTokens: number; outputTokens: number };

export type ToolInputSchema = { type: "object"; [key: string]: unknown };

/** `none` keeps the tools in the request, so earlier tool calls stay valid, but the model may not call one. */
export type ToolChoice = "auto" | "none";

/** What the server needs to know about a tool. The function that runs it never leaves the caller. */
export type ToolSchema = { name: string; description: string; inputSchema: ToolInputSchema };

/** A tool as the caller holds it. `run` validates the model's input itself and throws on bad input. */
export type AnthropicTool = ToolSchema & { run: (rawInput: unknown) => Promise<string> };

export type SendMessageParams = {
  model?: AnthropicModelId;
  system?: string;
  messages: ChatMessage[];
  tools?: ToolSchema[];
  toolChoice?: ToolChoice;
  maxTokens?: number;
};

export type SendMessageResult = {
  content: ContentBlock[];
  stopReason: AnthropicStopReason | null;
  usage: TokenUsage;
  model: string;
};

/** Everything one prompt cost, across every model call it took. */
export type TurnStats = {
  model: AnthropicModelId;
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** What the next prompt will resend as context, taken from the last call's input plus its reply. */
  contextTokens: number;
};

/**
 * One prompt and everything that came back for it. A turn with no replies (the run failed after
 * spending tokens) is shown but never resent as context.
 */
export type ChatTurn = {
  prompt: ChatMessage;
  replies: ChatMessage[];
  stats: TurnStats | null;
  notice: string | null;
};

export type ConversationTotals = {
  apiCalls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};
