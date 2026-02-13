import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

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
};

export type AppProductProps = {
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
