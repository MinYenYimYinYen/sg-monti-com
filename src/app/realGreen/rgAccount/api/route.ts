import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { RgAccountContract } from "@/app/realGreen/rgAccount/api/RgAccountContract";
import { RgAccountRaw } from "@/app/realGreen/rgAccount/RgAccountTypes";
import { remapRgAccounts } from "@/app/realGreen/rgAccount/_lib/rgAccountServerFunc";

const handlers: HandlerMap<RgAccountContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawRgAccounts = await rgApi<RgAccountRaw[]>({
        path: "/GeneralLedger/Accounts",
        method: "GET",
        pathTemplate: "/GeneralLedger/Accounts",
      });

      return { success: true, payload: remapRgAccounts(rawRgAccounts) };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
