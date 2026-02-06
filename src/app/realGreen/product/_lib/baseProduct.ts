import { ProductCore } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import {
  ProductMaster,
  ProductMasterCore,
  ProductMasterDoc,
  ProductMasterDocProps,
  ProductMasterProps,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import {
  ProductSingleCore,
  ProductSingleDoc,
  ProductSingleDocProps,
  ProductSingleProps,
} from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import {
  ProductSub,
  ProductSubCore,
  ProductSubDoc,
  ProductSubDocProps,
  ProductSubProps,
} from "@/app/realGreen/product/_lib/types/ProductSubTypes";

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

export const baseProductMasterCore: ProductMasterCore = {
  ...baseProductCore,
  isMaster: true,
  isProduction: true,
  isMobile: true,
};

export const baseProductMasterDocProps: ProductMasterDocProps = {
  productId: baseNumId,
  subProductIds: [],
  category: baseStrId,
  createdAt: "",
  updatedAt: "",
};

export const baseProductMasterDoc: ProductMasterDoc = {
  ...baseProductMasterCore,
  ...baseProductMasterDocProps,
};

export const baseProductMasterProps: ProductMasterProps = {
  subProducts: [],
};

export const baseProductMaster: ProductMaster = {
  ...baseProductMasterDoc,
  ...baseProductMasterProps,
};

export const baseProductSingleCore: ProductSingleCore = {
  ...baseProductCore,
  isMaster: false,
  isProduction: true,
  isMobile: true,
};

export const baseProductSingleDocProps: ProductSingleDocProps = {
  productId: baseNumId,
  category: baseStrId,
  createdAt: "",
  updatedAt: "",
};

export const baseProductSingleDoc: ProductSingleDoc = {
  ...baseProductSingleCore,
  ...baseProductSingleDocProps,
};

export const baseProductSingeProps: ProductSingleProps = {};

export const baseProductSingle: ProductSingleDoc = {
  ...baseProductSingleDoc,
  ...baseProductSingeProps,
};

export const baseProductSubCore: ProductSubCore = {
  ...baseProductCore,
  isMaster: false,
  isProduction: true,
  isMobile: false,
}

export const baseProductSubDocProps: ProductSubDocProps = {
  productId: baseNumId,
  category: baseStrId,
  createdAt: "",
  updatedAt: "",
}

export const baseProductSubDoc: ProductSubDoc = {
  ...baseProductSubCore,
  ...baseProductSubDocProps,
}

export const baseProductSubProps: ProductSubProps = {}

export const baseProductSub: ProductSub = {
  ...baseProductSubDoc,
  ...baseProductSubProps,
}

