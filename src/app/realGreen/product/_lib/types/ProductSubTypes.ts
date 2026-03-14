import {
  ProductCommonDocProps,
  ProductCommonProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";

export type ProductSubCore = ProductCore & {
  isProduction: true;
  isMaster: false;
  isMobile: false;
};

export function isProductSubCore(
  productCore: ProductCore,
): productCore is ProductSubCore {
  const { isProduction, isMaster, isMobile } = productCore;
  return isProduction && !isMaster && !isMobile;
}

export type ProductSubDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number;
  appMethodId: string | null;
};

export type ProductSubDoc = ProductSubCore & ProductSubDocProps;

export type ProductSubProps = ProductCommonProps & {
  appMethod: AppMethod | null;
};

export type ProductSub = ProductSubDoc & ProductSubProps;
