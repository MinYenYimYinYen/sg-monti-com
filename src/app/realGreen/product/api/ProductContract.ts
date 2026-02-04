import { DataResponse } from "@/lib/api/types/responses";
import { ProductsResponse } from "@/app/realGreen/product/_lib/ProductTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface ProductContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<ProductsResponse>;
  };
}
