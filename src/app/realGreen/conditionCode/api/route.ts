import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ConditionContract } from "./ConditionContract";
import { rgApi } from "../../_lib/api/rgApi";
import { ConditionRaw } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { extendConditions, remapConditions } from "../_lib/serverConditionFunc";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { conditionCodeCapabilities } from "@/app/realGreen/conditionCode/conditionCodeCapabilities";

const { can } = conditionCodeCapabilities;
const handlers: HandlerMap<ConditionContract> = {
  getAll: {
    capability: can.conditionCodes.read,
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
