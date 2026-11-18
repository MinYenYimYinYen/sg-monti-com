import { z } from "zod";
import {
  ALLOWED_MODELS,
  MAX_MESSAGES,
  MAX_SYSTEM_CHARS,
  MAX_TOKENS_CAP,
  MAX_TOOL_DESCRIPTION_CHARS,
  MAX_TOOLS,
  TOOL_NAME_PATTERN,
} from "@/app/anthropic/anthropicConst";

// The route trusts nothing in the body: a caller holding the capability can still send any JSON.
// Unknown keys on a block are stripped, so only the fields this module knows about reach Anthropic.

const textBlockSchema = z.object({ type: z.literal("text"), text: z.string() });
const thinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
  signature: z.string(),
});
const redactedThinkingBlockSchema = z.object({ type: z.literal("redacted_thinking"), data: z.string() });
const toolUseBlockSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string().min(1),
  name: z.string().min(1),
  input: z.unknown(),
});
const toolResultBlockSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string().min(1),
  content: z.string(),
  is_error: z.boolean().optional(),
});

const contentBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  thinkingBlockSchema,
  redactedThinkingBlockSchema,
  toolUseBlockSchema,
  toolResultBlockSchema,
]);

// Exported so saved conversations are validated against the same shape the API accepts.
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.array(contentBlockSchema).min(1),
});

const toolSchemaSchema = z.object({
  name: z.string().regex(TOOL_NAME_PATTERN, "Tool names use letters, digits, _ and - (64 characters at most)"),
  description: z.string().min(1).max(MAX_TOOL_DESCRIPTION_CHARS),
  inputSchema: z.looseObject({ type: z.literal("object") }),
});

export const sendMessageParamsSchema = z.object({
  model: z.enum(ALLOWED_MODELS).optional(),
  system: z.string().max(MAX_SYSTEM_CHARS).optional(),
  messages: z.array(chatMessageSchema).min(1).max(MAX_MESSAGES),
  tools: z.array(toolSchemaSchema).max(MAX_TOOLS).optional(),
  maxTokens: z.number().int().min(1).max(MAX_TOKENS_CAP).optional(),
});
