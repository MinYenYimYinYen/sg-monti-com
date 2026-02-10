import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { PriceTableContract } from "@/app/realGreen/priceTable/api/PriceTableContract";
import {
  cachePriceTableDocs,
  fetchMongoPriceTableDocs,
  fetchRGPriceTableDocs,
} from "@/app/realGreen/priceTable/_lib/priceTableServerFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<PriceTableContract> = {
  getPriceTableDocs: {
    roles: ["office", "admin"],
    handler: async () => {
      const mongoCachedPriceTableDocs = await fetchMongoPriceTableDocs(0.5);
      if (mongoCachedPriceTableDocs) {
        return { success: true, payload: mongoCachedPriceTableDocs };
      }

      const rgPriceTableDocs = await fetchRGPriceTableDocs();

      const cacheResult = await cachePriceTableDocs(rgPriceTableDocs);
      if (!cacheResult.success) {
        console.error("Failed to cache price table docs", cacheResult);
        return {
          success: true,
          payload: rgPriceTableDocs,
          partialError: cacheResult.message,
        };
      }

      return { success: true, payload: rgPriceTableDocs };
    },
  },
};

export const POST = createRpcHandler(handlers);
