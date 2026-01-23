import { DataResponse } from "@/lib/api/types/responses";
import { PriceTable } from "@/app/realGreen/priceTable/PriceTable";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface PriceTableContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<PriceTable[]>;
  };
}
