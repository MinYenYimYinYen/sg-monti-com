import { z } from "zod";
import { MAX_REQUEST_CHARS } from "@/app/anthropic/anthropicConst";
import { sendMessageParamsSchema } from "@/app/anthropic/anthropicSchema";
import type { SendMessageParams } from "@/app/anthropic/AnthropicTypes";

const CHARS_PER_TOKEN_ESTIMATE = 4;

function measureRequestChars(params: Pick<SendMessageParams, "system" | "messages" | "tools">): number {
  return JSON.stringify({ system: params.system, messages: params.messages, tools: params.tools }).length;
}

/** Rough only (about 4 characters a token). It exists to stop a runaway conversation, not to bill. */
export function estimateRequestTokens(params: Pick<SendMessageParams, "system" | "messages" | "tools">): number {
  return Math.ceil(measureRequestChars(params) / CHARS_PER_TOKEN_ESTIMATE);
}

export type ParsedSendMessage = { ok: true; params: SendMessageParams } | { ok: false; message: string };

/** Everything the route checks before it spends money. */
export function parseSendMessageParams(raw: unknown): ParsedSendMessage {
  const parsed = sendMessageParamsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: `Invalid request. ${z.prettifyError(parsed.error)}` };

  const params: SendMessageParams = parsed.data;

  if (params.messages[params.messages.length - 1].role !== "user") {
    return { ok: false, message: "The last message must be from the user." };
  }

  const toolNames = (params.tools ?? []).map((tool) => tool.name);
  if (new Set(toolNames).size !== toolNames.length) {
    return { ok: false, message: "Tool names must be unique." };
  }

  if (measureRequestChars(params) > MAX_REQUEST_CHARS) {
    const tokens = estimateRequestTokens(params);
    return {
      ok: false,
      message: `This conversation is too long to send (about ${tokens.toLocaleString("en-US")} tokens). Clear it and start again.`,
    };
  }

  return { ok: true, params };
}
