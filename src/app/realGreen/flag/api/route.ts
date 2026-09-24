import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { FlagContract } from "@/app/realGreen/flag/api/FlagContract";
import { FlagRaw } from "@/app/realGreen/flag/FlagTypes";
import {
  extendFlags,
  remapFlags,
} from "@/app/realGreen/flag/_lib/flagServerFunc";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";

const handlers: HandlerMap<FlagContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawFlags = await rgApi<FlagRaw[]>({
        path: "/Flag",
        method: "GET",
        pathTemplate: "/Flag",
      });

      const flagCores = remapFlags(rawFlags)
        .filter((flag) => flag.available)
        .sort((a,b) => a.desc.localeCompare(b.desc))
      const flagDocs = await extendFlags(flagCores);

      return { success: true, payload: flagDocs };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
