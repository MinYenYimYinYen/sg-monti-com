import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ConditionContract } from "./ConditionContract";
import { rgApi } from "../../_lib/api/rgApi";
import { ConditionRaw } from "@/app/realGreen/conditionCode/_types/ConditionCode";
import { extendConditions, remapConditions } from "../_lib/serverConditionFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<ConditionContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      const rawConditions = await rgApi<ConditionRaw[]>({
        path: "/ConditionCode",
        method: "GET",
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

export const POST = createRpcHandler(handlers);
