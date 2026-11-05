import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportDecisionContract } from "@/app/qbo/importCCTxn/decisions/api/ImportDecisionContract";
import { saveDecisions } from "@/app/qbo/importCCTxn/_lib/importDecisionServer";

// Nothing here talks to QuickBooks. Mapping and skipping are our own data, so office may save,
// as they may on the mapping route. Posting is still admin only.
const handlers: HandlerMap<ImportDecisionContract> = {
  saveDecisions: {
    roles: ["office", "admin"],
    handler: async (params) => {
      return { success: true, payload: await saveDecisions(params) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
