import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { CustFlagContract } from "@/app/realGreen/custFlag/api/CustFlagContract";
import { CustFlagRefreshResult, FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";

export type CustFlagIdsSearch = {
  flagID: number;
  // companyIDs?: number[];
  statuses: string[];
};

/** Shape of a single flag entry returned by GET /Customer/{customerNumber}/Flags */
type RgCustomerFlag = {
  id: number;
  flag: number;
  customerNumber: number;
  descriptions: {
    englishValue: string;
    frenchValue: string;
    spanishValue: string;
  };
};

const handlers: HandlerMap<CustFlagContract> = {
  loadFlagIdCustIds: {
    roles: ["office", "admin", "tech"],
    handler: async ({ searches }) => {
      const promises = searches.map((search) =>
        rgApi<number[]>({
          path: "/Customer/Flag/IDs",
          method: "POST",
          body: search,
        }).then((custIds) => ({
          flagId: search.flagID,
          custIds,
        })),
      );

      const results: FlagIdCustIds[] = await Promise.all(promises);

      return { success: true, payload: results };
    },
  },

  refreshCustFlags: {
    roles: ["office", "admin", "tech"],
    handler: async ({ custId, flagIdsInState }) => {
      // Fetch all flags currently on this customer from RealGreen
      const allFlags = await rgApi<RgCustomerFlag[]>({
        path: `/Customer/${custId}/Flags`,
        method: "GET",
      });

      // Filter to only the flagIds we have loaded in state — ignore everything else
      const flagIdsOnCustomer = new Set(allFlags.map((f) => f.flag));
      const presentFlagIds = flagIdsInState.filter((id) => flagIdsOnCustomer.has(id));

      const result: CustFlagRefreshResult = { custId, presentFlagIds };
      return { success: true, payload: result };
    },
  },
};

export const POST = createRpcHandler(handlers);
