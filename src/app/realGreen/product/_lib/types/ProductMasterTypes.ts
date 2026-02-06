import {
  ProductCommonDocProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";

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

export type ProductMasterDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number,
  subProductIds: number[];
}

export type ProductMasterDoc = ProductMasterCore & ProductMasterDocProps;

export type ProductMasterProps = {
  subProducts: ProductSub[];
};

export type ProductMaster = ProductMasterDoc & ProductMasterProps;

