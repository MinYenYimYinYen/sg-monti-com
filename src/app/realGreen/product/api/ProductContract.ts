import { DataResponse, SuccessResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ProductCategoryStored } from "@/app/realGreen/product/_lib/types/ProductCategoryTypes";
import { ProductMasterDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDoc } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";



// Server response structure
export type ProductsResponse = {
  productMasterDocs: ProductMasterDoc[];
  productSingleDocs: ProductSingleDoc[];
  productSubDocs: ProductSubDoc[];
  // productDocs: ProductDoc[]; // Not extended - for UI configuration
};

export interface ProductContract extends ApiContract {
  getAll: {
    params: {};
    result: DataResponse<ProductsResponse>;
  };

  saveCategory: {
    params: ProductCategoryStored;
    result: SuccessResponse;
  }
}
