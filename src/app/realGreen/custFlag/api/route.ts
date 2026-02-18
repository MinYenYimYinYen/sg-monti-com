import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { CustFlagContract } from "@/app/realGreen/custFlag/api/CustFlagContract";
import { FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";

export type CustFlagIdsSearch = {
  flagID: number;
  // companyIDs?: number[];
  statuses: string[];
};

const handlers: HandlerMap<CustFlagContract> = {
  loadFlagIdCustIds: {
    roles: ["office", "admin", "tech"],
    handler: async ({ searches }) => {
      const promises = searches.map((search) => {
        return rgApi<FlagIdCustIds>({
          path: "/Customer/Flag/IDs",
          method: "POST",
          body: search,
        });
      });

      const results = await Promise.all(promises);

      return { success: true, payload: results };
    },
  },
};

export const POST = createRpcHandler(handlers);
