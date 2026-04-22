import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { PrepayContract } from "@/app/realGreen/prepay/api/PrepayContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { PrepayDoc, PrepayRaw } from "@/app/realGreen/prepay/PrepayTypes";
import { extendPrepays, remapPrepays } from "@/app/realGreen/prepay/_lib/prepayServerFunc";
import { DataResponse } from "@/lib/api/types/responses";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<PrepayContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawPrepays = await rgApi<PrepayRaw[]>({
        path: "/PrepayCodes/Available/true",
        method: "GET",
      });

      const prepayCores = remapPrepays(rawPrepays);
      const prepayDocs = await extendPrepays(prepayCores);

      const response: DataResponse<PrepayDoc[]> = {
        success: true,
        payload: prepayDocs,
      };

      return response;
    },
  },
};

export const POST = createRpcHandler(handlers);
