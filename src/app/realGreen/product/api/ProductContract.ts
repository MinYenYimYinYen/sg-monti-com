import { DataResponse, SuccessResponse } from "@/lib/api/types/responses";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { ProductCategoryStored } from "@/app/realGreen/product/_lib/types/ProductCategoryTypes";
import {
  ProductMasterDoc,
  SubProductConfigDoc,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingleDoc } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import {
  ProductCommonDoc,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";



// Server response structure
export type ProductsResponse = {
  productMasterDocs: ProductMasterDoc[];
  productSingleDocs: ProductSingleDoc[];
  productSubDocs: ProductSubDoc[];
  productCommonDocs: ProductCommonDoc[];
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

  saveMasterSubProducts: {
    params: {masterId: number, subProductConfigs: SubProductConfigDoc[]}
    result: SuccessResponse;
  }

  saveUnit: {
    params: {unit: Unit}
    result: SuccessResponse;
  }
}
