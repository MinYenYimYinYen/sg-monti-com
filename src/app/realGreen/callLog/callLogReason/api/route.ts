import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CallLogReasonContract } from "@/app/realGreen/callLog/callLogReason/api/CallLogReasonContract";
import { CallLogReasonRaw } from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";
import {
  fetchAndExtendCallLogReasons,
} from "@/app/realGreen/callLog/callLogReason/_lib/callLogReasonServerFunc";

const handlers: HandlerMap<CallLogReasonContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const raw = await rgApi<CallLogReasonRaw[]>({
        path: "/CallReason",
        method: "GET",
      });

      const docs = await fetchAndExtendCallLogReasons(raw);

      return { success: true, payload: docs };
    },
  },
};

export const POST = createRpcHandler(handlers);
