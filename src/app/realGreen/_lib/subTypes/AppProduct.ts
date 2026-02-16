import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

export type AppProductRaw = {
  actAmount?: number;
  applicationMethod?: string;
  applicationMethodID?: number;
  id: number;
  locationID?: number;
  productID: number;
  serviceID: number;
  treatedArea?: number;
};

export type AppProductCore = {
  productId: number;
  servId: number;
  amount: number;
  size: number;
  //todo: this should include productCommonDoc
};


export type AppProductProps = {
  productCommon: ProductCommon;
};

export type AppProduct = AppProductCore & AppProductProps;

function remapUsedProduct(raw: AppProductRaw): AppProductCore {
  return {
    productId: raw.productID,
    servId: raw.serviceID,
    amount: raw.actAmount || 0,
    size: raw.treatedArea || 0,
  };
}

export function remapAppProducts(raw: AppProductRaw[]) {
  return raw.map((r) => remapUsedProduct(r));
}
