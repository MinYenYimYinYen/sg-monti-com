import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportDecisionContract } from "@/app/qbo/importCCTxn/decisions/api/ImportDecisionContract";
import { saveDecisions } from "@/app/qbo/importCCTxn/_lib/importDecisionServer";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";

const { can } = importCCTxnCapabilities;

// Nothing here talks to QuickBooks. Mapping and skipping are our own data. One request saves
// merchant mappings, row accounts, row skips and skip rules, so it has its own capability instead
// of borrowing one of theirs.
const handlers: HandlerMap<ImportDecisionContract> = {
  saveDecisions: {
    capability: can.mapDecisions.write,
    handler: async (params) => {
      return { success: true, payload: await saveDecisions(params) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
