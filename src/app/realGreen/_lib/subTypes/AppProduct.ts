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
  method: string;
  productId: number;
  servId: number;
  amount: number;
  treated: number;
};


export type AppProductProps = {
  productCommon: ProductCommon;
};

export type AppProduct = AppProductCore & AppProductProps;

function remapUsedProduct(raw: AppProductRaw): AppProductCore {
  return {
    method: raw.applicationMethod || "",
    productId: raw.productID,
    servId: raw.serviceID,
    amount: raw.actAmount || 0,
    treated: raw.treatedArea || 0,
  };
}

export function remapAppProducts(raw: AppProductRaw[]) {
  return raw.map((r) => remapUsedProduct(r));
}
