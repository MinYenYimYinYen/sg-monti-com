import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AnthropicContract } from "@/app/anthropic/api/AnthropicContract";
import { DEFAULT_MODEL } from "@/app/anthropic/anthropicConst";
import { parseSendMessageParams } from "@/app/anthropic/anthropicRequest";
import { sendToAnthropic } from "@/app/anthropic/anthropicServer";
import { AppError } from "@/lib/errors/AppError";
import { can } from "@/permission/can";

// Next reads this at build time, so it must be a literal. It has to exceed two attempts of
// ANTHROPIC_TIMEOUT_MS (one retry). The platform plan may cap it lower.
export const maxDuration = 120;

const handlers: HandlerMap<AnthropicContract> = {
  sendMessage: {
    // Every call is billed to the company's Anthropic account.
    capability: can.claudeRequests.write,
    handler: async (rawParams) => {
      const parsed = parseSendMessageParams(rawParams);
      if (!parsed.ok) {
        throw new AppError({ message: parsed.message, type: "VALIDATION_ERROR", statusCode: 400 });
      }

      const result = await sendToAnthropic(parsed.params);

      console.info(
        `[Anthropic] ${parsed.params.model ?? DEFAULT_MODEL}: ${result.usage.inputTokens} in, ${result.usage.outputTokens} out, stop ${result.stopReason}`,
      );
      return { success: true, payload: result };
    },
  },
};

export const POST = createRpcHandler(handlers);
