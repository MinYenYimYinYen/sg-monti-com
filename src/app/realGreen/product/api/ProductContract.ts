import { ArrayResponse } from "@/lib/api/types/responses";
import { Product } from "@/app/realGreen/product/Product";

export interface ProductContract {
  getAll: {
    params: {};
    result: ArrayResponse<Product>;
  };
}
