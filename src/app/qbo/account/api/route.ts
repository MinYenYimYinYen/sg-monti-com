import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboAccountContract } from "@/app/qbo/account/api/QboAccountContract";
import { loadQboAccounts } from "@/app/qbo/account/_lib/qboAccountServer";

const handlers: HandlerMap<QboAccountContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      return { success: true, payload: await loadQboAccounts() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
