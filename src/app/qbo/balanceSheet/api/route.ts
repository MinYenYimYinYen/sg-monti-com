import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboBalanceSheetContract } from "@/app/qbo/balanceSheet/api/QboBalanceSheetContract";
import { readQboAccountBalance } from "@/app/qbo/balanceSheet/_lib/qboBalanceSheetServer";
import { can } from "@/permission/can";

const handlers: HandlerMap<QboBalanceSheetContract> = {
  getAccountBalance: {
    capability: can.qboBalanceSheet.read,
    handler: async ({ accountId, asOfDate }) => {
      return { success: true, payload: await readQboAccountBalance({ accountId, asOfDate }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
