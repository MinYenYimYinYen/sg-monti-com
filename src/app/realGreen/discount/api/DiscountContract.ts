import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";

export interface DiscountContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<DiscountDoc[]>;
  };
}
