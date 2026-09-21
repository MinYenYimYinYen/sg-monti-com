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
      // TODO: Confirm the correct RealGreen endpoint path for action reasons.
      // Likely "/ActionReason" — verify against RealGreen API docs or Swagger.
      // The path below is a placeholder and will cause a type error until confirmed.
      // Replace "/ActionReason" with the verified path and add it to RgApiPath in rgApi.ts.
      const raw = await rgApi<CallLogReasonRaw[]>({
        path: "/CallLog/CallLogSearch",  // PLACEHOLDER — replace with actual /ActionReason path
        method: "POST",
        body: {},
      } as any);

      const docs = await fetchAndExtendCallLogReasons(raw);

      return { success: true, payload: docs };
    },
  },
};

export const POST = createRpcHandler(handlers);
