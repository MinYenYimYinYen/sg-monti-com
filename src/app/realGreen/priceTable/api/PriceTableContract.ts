import { ArrayResponse } from "@/lib/api/types/responses";
import { PriceTable } from "@/app/realGreen/priceTable/PriceTable";

export interface PriceTableContract {
  getAll: {
    params: {};
    result: ArrayResponse<PriceTable>;
  };
}
