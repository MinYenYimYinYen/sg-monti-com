import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { TaxCodeContract } from "@/app/realGreen/taxCode/api/TaxCodeContract";
import { TaxCodeRaw } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { extendTaxCodes, remapTaxCodes } from "../_lib/taxCodeServerFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<TaxCodeContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawTaxCodes = await rgApi<TaxCodeRaw[]>({
        path: "/Tax",
        method: "GET",
      });

      const taxCodesCore = remapTaxCodes(rawTaxCodes);
      const taxCodeDocs = await extendTaxCodes(taxCodesCore)
      

      return { success: true, payload: taxCodeDocs };
    },
  },
};

export const POST = createRpcHandler(handlers);
