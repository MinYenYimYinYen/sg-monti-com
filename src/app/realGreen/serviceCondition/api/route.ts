import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ServiceConditionContract } from "@/app/realGreen/serviceCondition/api/ServiceConditionContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ServiceConditionRaw } from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import {
  extendServiceConditions,
  remapServiceConditions,
} from "@/app/realGreen/serviceCondition/_lib/ServiceConditionServerFunc";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";

const handlers: HandlerMap<ServiceConditionContract> = {
  getServiceConditions: {
    roles: ["office", "admin", "tech"],
    handler: async ({ serviceIds }) => {
      const raw = await rgApi<ServiceConditionRaw[]>({
        path: "/ServiceConditions/Search",
        method: "POST",
        body: { serviceIDs: serviceIds },
        pathTemplate: "/ServiceConditions/Search",
      });
      const cores = remapServiceConditions(raw);

      const docs = await extendServiceConditions(cores);

      return { success: true, payload: docs };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
