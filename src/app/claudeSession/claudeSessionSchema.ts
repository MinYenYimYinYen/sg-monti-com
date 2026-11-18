import { z } from "zod";
import { ALLOWED_MODELS, MAX_MESSAGES, MAX_SYSTEM_CHARS } from "@/app/anthropic/anthropicConst";
import { chatMessageSchema } from "@/app/anthropic/anthropicSchema";
import {
  MAX_NOTICE_CHARS,
  MAX_SESSION_KIND_CHARS,
  MAX_TURN_CHARS,
} from "@/app/claudeSession/claudeSessionConst";
import type { AppendTurnParams } from "@/app/claudeSession/ClaudeSessionTypes";

// The route trusts nothing in the body. A turn is validated with the same message schema the
// Claude route uses, so what is stored is always something that can be sent back to the API.

const turnStatsSchema = z.object({
  model: z.enum(ALLOWED_MODELS),
  apiCalls: z.number().int().min(0),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  costUsd: z.number().min(0),
  contextTokens: z.number().int().min(0),
});

const appendTurnParamsSchema = z.object({
  sessionId: z.uuid(),
  kind: z.string().trim().min(1).max(MAX_SESSION_KIND_CHARS),
  turn: z.object({
    prompt: chatMessageSchema.refine((message) => message.role === "user", "The prompt must be a user message."),
    replies: z.array(chatMessageSchema).max(MAX_MESSAGES),
    stats: turnStatsSchema.nullable(),
    notice: z.string().max(MAX_NOTICE_CHARS).nullable(),
    system: z.string().max(MAX_SYSTEM_CHARS),
  }),
});

export type ParsedAppendTurn = { ok: true; params: AppendTurnParams } | { ok: false; message: string };

export function parseAppendTurnParams(raw: unknown): ParsedAppendTurn {
  const parsed = appendTurnParamsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: `Invalid request. ${z.prettifyError(parsed.error)}` };

  const params: AppendTurnParams = parsed.data;
  if (JSON.stringify(params.turn).length > MAX_TURN_CHARS) {
    return { ok: false, message: "This turn is too large to save." };
  }
  return { ok: true, params };
}
