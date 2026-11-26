import { z } from "zod";
import {
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENTS_PER_REQUEST,
  MAX_REQUEST_CHARS,
  MAX_SERVER_TOKENS_CAP,
} from "@/app/anthropic/anthropicConst";
import { sendMessageParamsSchema } from "@/app/anthropic/anthropicSchema";
import type { ChatMessage, DocumentBlock, SendMessageParams } from "@/app/anthropic/AnthropicTypes";

const CHARS_PER_TOKEN_ESTIMATE = 4;

/** Every PDF in the conversation, in order. */
function findDocuments(messages: ChatMessage[]): DocumentBlock[] {
  return messages.flatMap((message) =>
    message.content.filter((block): block is DocumentBlock => block.type === "document"),
  );
}

/** Size of the file a base64 string stands for, without decoding it. */
export function measureBase64Bytes(data: string): number {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return Math.floor((data.length * 3) / 4) - padding;
}

/**
 * The request as the text cap sees it. A document's base64 is replaced by a short stand-in: a PDF
 * is held to its own byte limit by `checkSendMessageParams`, and its cost to the model is pages, not
 * characters, so counting its base64 here would reject every document.
 */
function measureRequestChars(params: Pick<SendMessageParams, "system" | "messages" | "tools">): number {
  const messages = params.messages.map((message) => ({
    ...message,
    content: message.content.map((block) =>
      block.type === "document" ? { ...block, source: { ...block.source, data: "" } } : block,
    ),
  }));
  return JSON.stringify({ system: params.system, messages, tools: params.tools }).length;
}

/** Rough only (about 4 characters a token). It exists to stop a runaway conversation, not to bill. */
export function estimateRequestTokens(params: Pick<SendMessageParams, "system" | "messages" | "tools">): number {
  return Math.ceil(measureRequestChars(params) / CHARS_PER_TOKEN_ESTIMATE);
}

export type ParsedSendMessage = { ok: true; params: SendMessageParams } | { ok: false; message: string };

/**
 * The checks that need no schema: they hold for any request, whoever built it. The browser route
 * reaches them through `parseSendMessageParams`. A feature that builds its own request on the server
 * (one that carries a PDF) calls this directly, since its input was never untrusted JSON.
 */
export function checkSendMessageParams(params: SendMessageParams): ParsedSendMessage {
  if (params.messages.length === 0 || params.messages[params.messages.length - 1].role !== "user") {
    return { ok: false, message: "The last message must be from the user." };
  }

  const toolNames = (params.tools ?? []).map((tool) => tool.name);
  if (new Set(toolNames).size !== toolNames.length) {
    return { ok: false, message: "Tool names must be unique." };
  }

  if (params.maxTokens !== undefined && params.maxTokens > MAX_SERVER_TOKENS_CAP) {
    return { ok: false, message: `The token limit cannot exceed ${MAX_SERVER_TOKENS_CAP}.` };
  }

  const documents = findDocuments(params.messages);
  if (documents.length > MAX_DOCUMENTS_PER_REQUEST) {
    return { ok: false, message: `A request can carry ${MAX_DOCUMENTS_PER_REQUEST} PDF at most.` };
  }
  for (const document of documents) {
    if (measureBase64Bytes(document.source.data) > MAX_DOCUMENT_BYTES) {
      return { ok: false, message: "This PDF is too large to send. Split it into smaller parts." };
    }
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

/** Everything the browser route checks before it spends money. A document never passes the schema. */
export function parseSendMessageParams(raw: unknown): ParsedSendMessage {
  const parsed = sendMessageParamsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: `Invalid request. ${z.prettifyError(parsed.error)}` };
  return checkSendMessageParams(parsed.data);
}
