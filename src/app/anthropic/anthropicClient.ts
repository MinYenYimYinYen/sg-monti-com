import { api } from "@/lib/api/api";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { DataResponse } from "@/lib/api/types/responses";
import { AppError } from "@/lib/errors/AppError";
import type { AnthropicContract } from "@/app/anthropic/api/AnthropicContract";
import type { SendMessageParams, SendMessageResult } from "@/app/anthropic/AnthropicTypes";

/**
 * One request to the route. Operational failures come back from `api()` as data, so they are
 * turned into a thrown AppError here: the tool loop treats any thrown error as the end of the run.
 */
export async function sendViaApi(params: SendMessageParams): Promise<SendMessageResult> {
  const body: OpMap<AnthropicContract> = { op: "sendMessage", ...params };
  const response = await api<DataResponse<SendMessageResult>>("/anthropic/api", { method: "POST", body });
  if (!response.success) {
    throw new AppError({ message: response.message, type: "API_ERROR", statusCode: response.code ?? 500 });
  }
  return response.payload;
}
