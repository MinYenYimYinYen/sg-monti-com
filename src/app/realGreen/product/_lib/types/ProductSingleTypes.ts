import { ProductCommonDocProps, ProductCommonProps, ProductCore } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";


export type ProductSingleCore = ProductCore & {
  isProduction: true;
  isMaster: false;
  isMobile: true;
};

export function isProductSingleCore(
  productCore: ProductCore,
): productCore is ProductSingleCore {
  const { isProduction, isMaster, isMobile } = productCore;
  return isProduction && !isMaster && isMobile;
}

export type ProductSingleDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number;
};

export type ProductSingleDoc = ProductSingleCore & ProductSingleDocProps;

export type ProductSingleProps = ProductCommonProps;

export type ProductSingle = ProductSingleDoc & ProductSingleProps;
