import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboAccountContract } from "@/app/qbo/account/api/QboAccountContract";
import { loadQboAccounts } from "@/app/qbo/account/_lib/qboAccountServer";
import { can } from "@/permission/can";

const handlers: HandlerMap<QboAccountContract> = {
  getAll: {
    capability: can.qboAccounts.read,
    handler: async () => {
      return { success: true, payload: await loadQboAccounts() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
