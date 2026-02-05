import { DataResponse } from "@/lib/api/types/responses";
import { ProductsResponse } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ProductCategory } from "@/app/realGreen/product/_lib/types/ProductCategoryTypes";

export interface ProductContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<ProductsResponse>;
  };

  getCategories: {
    params: {};
    result: DataResponse<ProductCategory[]>;
  }
}
