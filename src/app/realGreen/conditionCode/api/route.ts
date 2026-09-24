import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ConditionContract } from "./ConditionContract";
import { rgApi } from "../../_lib/api/rgApi";
import { ConditionRaw } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { extendConditions, remapConditions } from "../_lib/serverConditionFunc";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";

const handlers: HandlerMap<ConditionContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      const rawConditions = await rgApi<ConditionRaw[]>({
        path: "/ConditionCode",
        method: "GET",
        pathTemplate: "/ConditionCode",
      });

      const conditionCores = remapConditions(rawConditions);
      const conditionDocs = await extendConditions(conditionCores);

      return {
        success: true,
        payload: conditionDocs,
      };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
