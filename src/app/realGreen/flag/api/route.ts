import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { FlagContract } from "@/app/realGreen/flag/api/FlagContract";
import { FlagRaw } from "@/app/realGreen/flag/FlagTypes";
import {
  extendFlags,
  remapFlags,
} from "@/app/realGreen/flag/_lib/flagServerFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<FlagContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawFlags = await rgApi<FlagRaw[]>({
        path: "/Flag",
        method: "GET",
      });

      const flagCores = remapFlags(rawFlags);
      const flagDocs = await extendFlags(flagCores);

      return { success: true, payload: flagDocs };
    },
  },
};

export const POST = createRpcHandler(handlers);
