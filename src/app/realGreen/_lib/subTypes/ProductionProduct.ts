import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

export type ProductionProductRaw = {
  actAmount?: number;
  applicationMethod?: string;
  applicationMethodID?: number;
  id: number;
  locationID?: number;
  productID: number;
  serviceID: number;
  treatedArea?: number;
};

export type ProductionProductCore = {
  method: string;
  productId: number;
  servId: number;
  amount: number;
  treated: number;
};


export type ProductionProductProps = {
  productCommon: ProductCommon;
};

export type ProductionProduct = ProductionProductCore & ProductionProductProps;

function remapProductionProduct(raw: ProductionProductRaw): ProductionProductCore {
  return {
    method: raw.applicationMethod || "",
    productId: raw.productID,
    servId: raw.serviceID,
    amount: raw.actAmount || 0,
    treated: raw.treatedArea || 0,
  };
}

export function remapProductionProducts(raw: ProductionProductRaw[]) {
  return raw.map((r) => remapProductionProduct(r));
}
