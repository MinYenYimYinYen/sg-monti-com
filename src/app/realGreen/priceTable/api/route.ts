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

      // Filter and sort before caching so the stored data is already clean.
      // This ensures the cache-hit path also returns filtered/sorted data.
      const available = rgPriceTableDocs
        .filter((pt) => pt.available)
        .sort((a, b) => a.desc.localeCompare(b.desc));

      const cacheResult = await cachePriceTableDocs(available);
      if (!cacheResult.success) {
        console.error("Failed to cache price table docs", cacheResult);
        return {
          success: true,
          payload: available,
          partialError: cacheResult.message,
        };
      }

      return { success: true, payload: available };
    },
  },
};

export const POST = createRpcHandler(handlers);
