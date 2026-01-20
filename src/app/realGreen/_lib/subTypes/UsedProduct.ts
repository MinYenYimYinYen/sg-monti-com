import {CreatedUpdated} from "@/lib/mongoose/mongooseTypes";
import {Grouper} from "@/lib/Grouper";

export type UsedProductRaw = {
  actAmount?: number;
  applicationMethod?: string;
  applicationMethodID?: number;
  id: number;
  locationID?: number;
  productID: number;
  serviceID: number;
  treatedArea?: number;
};

export type UsedProductRemapped = {
  usedProductId: number;
  productId: number;
  servId: number;
  amount: number;
  size: number;
};



export type UsedProductHydrate = {}

export type UsedProduct = UsedProductRemapped & UsedProductHydrate;

function remapUsedProduct(raw: UsedProductRaw): UsedProductRemapped {
  return {
    usedProductId: raw.id,
    productId: raw.productID,
    servId: raw.serviceID,
    amount: raw.actAmount || 0,
    size: raw.treatedArea || 0,

  }
}

export function remapUsedProducts(raw: UsedProductRaw[]) {
  return raw.map((r) => remapUsedProduct(r));
}
