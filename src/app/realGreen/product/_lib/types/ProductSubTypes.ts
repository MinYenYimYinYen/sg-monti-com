import {
  ProductCommonDocProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

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


export type MasterRate = {
  masterId: number,
  rate: number,
}

export type ProductSubDocProps = CreatedUpdated & ProductCommonDocProps & {
  productId: number;
};

export type ProductSubDoc = ProductSubCore & ProductSubDocProps;

export type ProductSubProps = {};

export type ProductSub = ProductSubDoc & ProductSubProps;
