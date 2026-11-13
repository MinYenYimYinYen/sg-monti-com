import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboAccountContract } from "@/app/qbo/account/api/QboAccountContract";
import { loadQboAccounts } from "@/app/qbo/account/_lib/qboAccountServer";
import { quickbooksCapabilities } from "@/app/qbo/quickbooksCapabilities";

const { can } = quickbooksCapabilities;

const handlers: HandlerMap<QboAccountContract> = {
  getAll: {
    capability: can.accounts.read,
    handler: async () => {
      return { success: true, payload: await loadQboAccounts() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
