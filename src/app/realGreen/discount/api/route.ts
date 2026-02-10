import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { DiscountContract } from "@/app/realGreen/discount/api/DiscountContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { DiscountDoc, DiscountRaw } from "@/app/realGreen/discount/Discount.types";
import { extendDiscounts, remapDiscounts } from "@/app/realGreen/discount/_lib/discountServerFunc";
import { DataResponse } from "@/lib/api/types/responses";
import { createRpcHandler } from "@/lib/api/createRpcHandler";


const handlers: HandlerMap<DiscountContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawDiscounts = await rgApi<DiscountRaw[]>({
        path: "/DiscountCode",
        method: "GET",
      })

      const discountCores = remapDiscounts(rawDiscounts);
      const discountDocs = await extendDiscounts(discountCores)

      const response: DataResponse<DiscountDoc[]> = {
        success: true,
        payload: discountDocs
      }

      return response;
    }
  }
};

export const POST = createRpcHandler(handlers);
