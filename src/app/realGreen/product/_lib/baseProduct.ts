import {
  Product,
  ProductCore,
  ProductDoc,
  ProductDocPropsMaster,
  ProductDocPropsSingle,
  ProductDocPropsSub,
  ProductMasterDoc,
  ProductProps,
  ProductSingleDoc,
  ProductSubDoc,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
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

export const baseProductDocPropsMaster: ProductDocPropsMaster = {
  productId: baseNumId,
  productType: 'master',
  subProductIds: [],
  createdAt: "",
  updatedAt: "",
};

export const baseProductDocPropsSub: ProductDocPropsSub = {
  productId: baseNumId,
  productType: 'sub',
  createdAt: "",
  updatedAt: "",
};

export const baseProductDocPropsSingle: ProductDocPropsSingle = {
  productId: baseNumId,
  productType: 'single',
  createdAt: "",
  updatedAt: "",
};

export const baseProductMasterDoc: ProductMasterDoc = {
  ...baseProductCore,
  ...baseProductDocPropsMaster,
};

export const baseProductSubDoc: ProductSubDoc = {
  ...baseProductCore,
  ...baseProductDocPropsSub,
};

export const baseProductSingleDoc: ProductSingleDoc = {
  ...baseProductCore,
  ...baseProductDocPropsSingle,
};

export const baseProductDoc: ProductDoc = baseProductSingleDoc;

export const baseProductProps: ProductProps = {};

export const baseProduct: Product = {
  ...baseProductDoc,
  ...baseProductProps,
};
