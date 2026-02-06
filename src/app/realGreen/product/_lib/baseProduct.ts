import {
  ProductCore,
  ProductDocPropsMaster,
  ProductDocPropsSingle,
  ProductDocPropsStorage,
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

// todo: Have to rework how product get reclassified and extended.
//  Might be best to use 3 separate MongoModels and eliminate the made
//  up productType field.  This would simplify the type weaving issue.
//  Three types files, three models, and each would follow the standard workflow.
export const baseProductDocPropsStorage: ProductDocPropsStorage = {
  productId: baseNumId,
  productType: "single",
  createdAt: "",
  updatedAt: "",
};

export const baseProductDocPropsMaster: ProductDocPropsMaster = {
  productId: baseNumId,
  productType: "master",
  subProductIds: [],
  createdAt: "",
  updatedAt: "",
  category: baseStrId,
};

export const baseProductDocPropsSub: ProductDocPropsSub = {
  productId: baseNumId,
  productType: "sub",
  createdAt: "",
  updatedAt: "",
  category: baseStrId,
};

export const baseProductDocPropsSingle: ProductDocPropsSingle = {
  productId: baseNumId,
  productType: "single",
  createdAt: "",
  updatedAt: "",
  category: baseStrId,
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

export const baseProductDoc: ProductDoc =
  baseProductSingleDoc || baseProductMasterDoc || baseProductSubDoc;

export const baseProductProps: ProductProps = {};

export const baseProduct: Product = {
  ...baseProductDoc,
  ...baseProductProps,
};
