import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  BadRequestError,
  ContentTooLargeError,
  OverloadedError,
  PaymentRequiredError,
  PermissionDeniedError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import {
  ANTHROPIC_MAX_RETRIES,
  ANTHROPIC_TIMEOUT_MS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
} from "@/app/anthropic/anthropicConst";
import type {
  AnthropicStopReason,
  ContentBlock,
  SendMessageParams,
  SendMessageResult,
} from "@/app/anthropic/AnthropicTypes";
import { AppError } from "@/lib/errors/AppError";

// The only file that imports the SDK, and it must never reach client code: it holds the API key.

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.SGMONTI_ANTHROPIC_KEY?.trim();
  if (!apiKey) {
    throw new AppError({
      message:
        "The Claude API is not set up: SGMONTI_ANTHROPIC_KEY is missing on the server.",
      type: "EXTERNAL_ERROR",
      statusCode: 503,
    });
  }
  cachedClient = new Anthropic({ apiKey, timeout: ANTHROPIC_TIMEOUT_MS, maxRetries: ANTHROPIC_MAX_RETRIES });
  return cachedClient;
}

function externalError({ message, statusCode }: { message: string; statusCode: number }): AppError {
  return new AppError({ message, type: "EXTERNAL_ERROR", statusCode });
}

/**
 * Turns an SDK failure into a message the user can act on. Upstream status codes and bodies stay
 * on the server; only plain-language text goes back. Anything unrecognised is rethrown as is, so
 * the handler logs it as a bug and the user sees the generic message.
 */
export function toAppError(e: unknown): unknown {
  if (e instanceof AppError) return e;
  if (e instanceof AuthenticationError || e instanceof PermissionDeniedError) {
    return externalError({
      message:
        "Anthropic rejected the server's API key. Check SGMONTI_ANTHROPIC_KEY.",
      statusCode: 502,
    });
  }
  if (e instanceof PaymentRequiredError) {
    return externalError({ message: "The Anthropic account has no credit left.", statusCode: 502 });
  }
  if (e instanceof RateLimitError) {
    return externalError({ message: "Anthropic is rate limiting requests. Wait a moment and try again.", statusCode: 429 });
  }
  if (e instanceof OverloadedError) {
    return externalError({ message: "Anthropic is overloaded right now. Try again shortly.", statusCode: 503 });
  }
  if (e instanceof APIConnectionTimeoutError) {
    return externalError({ message: "Anthropic took too long to answer. Try again.", statusCode: 504 });
  }
  if (e instanceof APIConnectionError) {
    return externalError({ message: "Could not reach Anthropic from the server.", statusCode: 502 });
  }
  if (e instanceof ContentTooLargeError) {
    return externalError({ message: "The request was too large for Anthropic. Clear the conversation.", statusCode: 413 });
  }
  if (e instanceof BadRequestError) {
    // The message describes what was wrong with the request (for example a bad tool schema) and carries no secrets.
    return externalError({ message: `Anthropic rejected the request: ${e.message}`, statusCode: 400 });
  }
  if (e instanceof APIError) {
    return externalError({ message: "Anthropic returned an error. Try again.", statusCode: 502 });
  }
  return e;
}

/** Keeps the blocks the chat understands. Server-run tool blocks are never requested, so none are expected. */
function mapResponseBlocks(blocks: Anthropic.ContentBlock[]): ContentBlock[] {
  const mapped: ContentBlock[] = [];
  for (const block of blocks) {
    if (block.type === "text") mapped.push({ type: "text", text: block.text });
    else if (block.type === "thinking") {
      mapped.push({ type: "thinking", thinking: block.thinking, signature: block.signature });
    } else if (block.type === "redacted_thinking") mapped.push({ type: "redacted_thinking", data: block.data });
    else if (block.type === "tool_use") {
      mapped.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
    }
  }
  return mapped;
}

/** Sends one request. Expects params already checked by `parseSendMessageParams`. */
export async function sendToAnthropic(params: SendMessageParams): Promise<SendMessageResult> {
  const client = getClient();
  const model = params.model ?? DEFAULT_MODEL;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: params.messages,
      ...(params.system ? { system: params.system } : {}),
      ...(params.tools && params.tools.length > 0
        ? {
            tools: params.tools.map(({ name, description, inputSchema }) => ({
              name,
              description,
              // Our schema type is looser than the SDK's, which declares `required` and `properties`.
              input_schema: inputSchema as Anthropic.Tool["input_schema"],
            })),
          }
        : {}),
    });

    return {
      content: mapResponseBlocks(response.content),
      stopReason: response.stop_reason as AnthropicStopReason | null,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      model: response.model,
    };
  } catch (e) {
    throw toAppError(e);
  }
}
