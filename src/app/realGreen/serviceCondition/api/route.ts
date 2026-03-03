import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ServiceConditionContract } from "@/app/realGreen/serviceCondition/api/ServiceConditionContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ServiceConditionRaw } from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import {
  extendServiceConditions,
  remapServiceConditions,
} from "@/app/realGreen/serviceCondition/_lib/ServiceConditionServerFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<ServiceConditionContract> = {
  getServiceConditions: {
    roles: ["office", "admin", "tech"],
    handler: async ({ serviceIds }) => {
      const raw = await rgApi<ServiceConditionRaw[]>({
        path: "/ServiceConditions/Search",
        method: "POST",
        body: { serviceIDs: serviceIds },
      });
      const cores = remapServiceConditions(raw);

      const docs = await extendServiceConditions(cores);

      return { success: true, payload: docs };
    },
  },
};

export const POST = createRpcHandler(handlers);
