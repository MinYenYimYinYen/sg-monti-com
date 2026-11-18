import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import type { SendMessageParams, SendMessageResult } from "@/app/anthropic/AnthropicTypes";

export interface AnthropicContract extends ApiContract {
  sendMessage: {
    params: SendMessageParams;
    result: DataResponse<SendMessageResult>;
  };
}
