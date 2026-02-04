import {
  Product,
  ProductCore,
  ProductDoc,
  ProductDocProps,
  ProductProps,
} from "@/app/realGreen/product/_lib/ProductTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseProductCore: ProductCore = {
  productId: baseNumId,
  description: baseStrId,
  isLabor: false,
  isMaster: false,
  isNonInventory: false,
  isProduction: false,
  isMobile: false,
  isWorkOrder: false,
  categoryId: baseNumId,
  productCode: baseStrId,
  unitId: baseNumId,
};

export const baseProductDocProps: ProductDocProps = {
  productId: baseNumId,
  createdAt: "",
  updatedAt: "",
};

export const baseProductDoc: ProductDoc = {
  ...baseProductCore,
  ...baseProductDocProps,
};

export const baseProductProps: ProductProps = {};

export const baseProduct: Product = {
  ...baseProductDoc,
  ...baseProductProps,
};
