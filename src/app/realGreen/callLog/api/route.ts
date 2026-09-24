import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { CallLogContract } from "@/app/realGreen/callLog/api/CallLogContract";
import { CallLogRaw } from "@/app/realGreen/callLog/CallLogTypes";
import { remapCallLogs } from "@/app/realGreen/callLog/_lib/callLogServerFunc";

const handlers: HandlerMap<CallLogContract> = {
  getCallLogsForCustomer: {
    roles: ["office", "admin"],
    handler: async ({ custId }) => {
      const rawLogs = await rgApi<CallLogRaw[]>({
        path: `/CallLog/Customer/${custId}`,
        method: "GET",
        pathTemplate: "/CallLog/Customer/{custId}",
      });
      const docs = remapCallLogs(rawLogs);
      return { success: true, payload: docs };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
