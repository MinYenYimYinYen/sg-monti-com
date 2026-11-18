/**
 * Models the route will accept. Fable is left out on purpose: it costs 80x Haiku per input token,
 * and this is a generic chat for trying things, not a place to spend that by accident. Add it here
 * and in `anthropicPricing.ts` together if it is ever wanted.
 */
export const ALLOWED_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type AnthropicModelId = (typeof ALLOWED_MODELS)[number];

export const DEFAULT_MODEL: AnthropicModelId = "claude-haiku-5-5";

export const MODEL_OPTIONS: readonly { modelId: AnthropicModelId; label: string }[] = [
  { modelId: "claude-haiku-5-5", label: "Haiku 5.5 (cheapest)" },
  { modelId: "claude-sonnet-5-5", label: "Sonnet 5.5" },
  { modelId: "claude-opus-5-5", label: "Opus 5.5" },
];

/**
 * Thinking is on by default and its tokens count toward `max_tokens`, so a small limit can be spent
 * before any answer text appears. Hence the generous default.
 */
export const DEFAULT_MAX_TOKENS = 2048;
export const MAX_TOKENS_CAP = 8192;

export const MAX_MESSAGES = 100;
export const MAX_TOOLS = 20;
export const MAX_SYSTEM_CHARS = 8_000;
export const MAX_TOOL_DESCRIPTION_CHARS = 2_000;
export const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Size of the whole request body (messages, system prompt and tool schemas) as JSON. About 4
 * characters per token puts this near 50k tokens, well under the 100k-token step where Haiku's
 * price jumps 5x. It is a rough guard against a runaway conversation, not an exact token count.
 */
export const MAX_REQUEST_CHARS = 200_000;

/** How many model calls one prompt may take when tools are involved. */
export const MAX_TOOL_ITERATIONS = 6;
export const MAX_TOOL_RESULT_CHARS = 20_000;

/**
 * One request can take a while on a larger model, and the SDK retries once on a rate limit or
 * overload. Worst case is about two attempts of the timeout, which must stay under the route's
 * `maxDuration` (a literal in `api/route.ts`, because Next reads it at build time).
 */
export const ANTHROPIC_TIMEOUT_MS = 50_000;
export const ANTHROPIC_MAX_RETRIES = 1;
