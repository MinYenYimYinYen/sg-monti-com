import { DataResponse } from "@/lib/api/types/responses";
import { Product } from "@/app/realGreen/product/ProductTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

export interface ProductContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<Product[]>;
  };
}
