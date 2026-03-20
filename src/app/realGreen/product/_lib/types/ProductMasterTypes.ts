import {
  ProductCommonDocProps,
  ProductCommonProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";

export type ProductMasterCore = ProductCore & {
  isProduction: true;
  isMaster: true;
  isMobile: true;
};

export function isProductMasterCore(
  productCore: ProductCore,
): productCore is ProductMasterCore {
  const { isProduction, isMaster, isMobile } = productCore;
  return isProduction && isMaster && isMobile;
}

export type SubProductConfigDoc = {
  subId: number;
  rate: number;
  appMethodId: string | null;
  useAppMethod: boolean;
};

export type SubProductConfig = {
  subId: number;
  subProduct: ProductSub;
  rate: number;
};

export type ProductMasterDocProps = CreatedUpdated &
  ProductCommonDocProps & {
    productId: number;
    subProductConfigDocs: SubProductConfigDoc[];
    // appMethodId: string | null;
    // useAppMethod: boolean;
  };

export type ProductMasterDoc = ProductMasterCore & ProductMasterDocProps;

export type ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[];
  // appMethod: AppMethod | null;

};

export type ProductMaster = ProductMasterDoc & ProductMasterProps;
