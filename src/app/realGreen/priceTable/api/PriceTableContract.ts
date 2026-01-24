import { DataResponse } from "@/lib/api/types/responses";
import { PriceTableDoc } from "@/app/realGreen/priceTable/_entities/PriceTableTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface PriceTableContract extends ApiContract {
  getPriceTableDocs: {
    params: {};
    result: DataResponse<PriceTableDoc[]>;
  };
}
