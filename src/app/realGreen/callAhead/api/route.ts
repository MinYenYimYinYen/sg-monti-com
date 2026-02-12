import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CallAheadContract } from "@/app/realGreen/callAhead/api/CallAheadContract";
import {
  extendCallAheads,
  remapCallAheads,
} from "@/app/realGreen/callAhead/_lib/callAheadServerFunc";
import { CallAheadRaw } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<CallAheadContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawCallAheads = await rgApi<CallAheadRaw[]>({
        path: "/CallAhead",
        method: "GET",
      });

      const callAheadCores = remapCallAheads(rawCallAheads);

      const callAheadDocs = await extendCallAheads(callAheadCores);


      return { success: true, payload: callAheadDocs };
    },
  },
};

export const POST = createRpcHandler(handlers);
