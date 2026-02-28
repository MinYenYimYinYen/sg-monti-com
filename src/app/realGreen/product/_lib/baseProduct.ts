import {
  ProductCommon,
  ProductCommonDoc,
  ProductCommonDocProps,
  ProductCommonProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
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
import { baseUnit } from "@/app/realGreen/product/_lib/types/UnitTypes";
import {baseProductUnitConfig} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { UnitConfigDisplay } from "@/app/realGreen/product/_lib/utils/unitConfigDisplay";

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
  subProductConfigDocs: [],
  category: baseStrId,
  unit: baseUnit,
  createdAt: "",
  updatedAt: "",
};

export const baseProductMasterDoc: ProductMasterDoc = {
  ...baseProductMasterCore,
  ...baseProductMasterDocProps,
};

export const baseProductMasterProps: ProductMasterProps = {
  subProductConfigs: [],
  // unitConfig: baseProductUnitConfig,
  // unitConfigDisplay: new UnitConfigDisplay(baseProductUnitConfig),
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
  unit: baseUnit,
  createdAt: "",
  updatedAt: "",
};

export const baseProductSingleDoc: ProductSingleDoc = {
  ...baseProductSingleCore,
  ...baseProductSingleDocProps,
};

export const baseProductSingleProps: ProductSingleProps = {
  unitConfig: baseProductUnitConfig,
  unitConfigDisplay: new UnitConfigDisplay(baseProductUnitConfig),
};

export const baseProductSingle: ProductSingleDoc = {
  ...baseProductSingleDoc,
  ...baseProductSingleProps,
};

export const baseProductSubCore: ProductSubCore = {
  ...baseProductCore,
  isMaster: false,
  isProduction: true,
  isMobile: false,
};

export const baseProductSubDocProps: ProductSubDocProps = {
  productId: baseNumId,
  category: baseStrId,
  unit: baseUnit,
  createdAt: "",
  updatedAt: "",
};

export const baseProductSubDoc: ProductSubDoc = {
  ...baseProductSubCore,
  ...baseProductSubDocProps,
};

export const baseProductSubProps: ProductSubProps = {
  unitConfig: baseProductUnitConfig,
  unitConfigDisplay: new UnitConfigDisplay(baseProductUnitConfig),
};

export const baseProductSub: ProductSub = {
  ...baseProductSubDoc,
  ...baseProductSubProps,
};

export const baseProductCommonDocProps: ProductCommonDocProps = {
  productId: baseNumId,
  category: baseStrId,
  unit: baseUnit,
};

export const baseProductCommonDoc: ProductCommonDoc = {
  ...baseProductCore,
  ...baseProductCommonDocProps,
};

export const baseProductCommonProps: ProductCommonProps = {
  unitConfig: baseProductUnitConfig,
  unitConfigDisplay: new UnitConfigDisplay(baseProductUnitConfig),
};

export const baseProductCommon: ProductCommon = {
  ...baseProductCommonDoc,
  ...baseProductCommonProps,
};
