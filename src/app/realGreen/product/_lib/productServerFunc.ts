import {
  ProductCore,
  ProductRaw,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import {
  isProductMasterCore,
  ProductMasterCore,
  ProductMasterDoc,
  ProductMasterDocProps,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import {
  isProductSingleCore,
  ProductSingleCore,
  ProductSingleDoc,
  ProductSingleDocProps, // Added this import
} from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import {
  isProductSubCore,
  ProductSubCore,
  ProductSubDoc,
  ProductSubDocProps,
} from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Grouper } from "@/lib/Grouper";
import {
  baseProductMasterDocProps,
  baseProductSingleDocProps,
} from "@/app/realGreen/product/_lib/baseProduct";

export function remapRawProducts(raw: ProductRaw[]) {
  // ... (unchanged)
  const cores: ProductCore[] = raw.map((p) => {
    return {
      productId: p.id,
      description: p.description,
      isLabor: p.isLabor,
      isMaster: p.isMaster,
      isNonInventory: p.isNonInventory,
      isProduction: p.isProduction,
      isMobile: p.availableOnHandheld,
      isWorkOrder: p.isWorkOrder,
      categoryId: p.productCategoryId,
      productCode: p.productCode,
      unitId: p.unitofMeasure,
    };
  });

  const masterCores: ProductMasterCore[] = [];
  const singleCores: ProductSingleCore[] = [];
  const subCores: ProductSubCore[] = [];
  const productCores: ProductCore[] = [];

  for (const core of cores) {
    if (isProductMasterCore(core)) masterCores.push(core);
    if (isProductSingleCore(core)) singleCores.push(core);
    if (isProductSubCore(core)) subCores.push(core);
    productCores.push(core);
  }
  return {
    masterCores,
    singleCores,
    subCores,
    productCores,
  };
}

// New Generic Function
export function extendProducts<
  TCore extends { productId: number },
  TDocProps extends { productId: number },
>(
  cores: TCore[],
  docProps: TDocProps[],
  baseDocProps: TDocProps,
): (TCore & TDocProps)[] {
  const docPropsMap = new Grouper(docProps).toUniqueMap((p) => p.productId);
  return cores.map((core) => {
    const docProps = docPropsMap.get(core.productId) || baseDocProps;
    const { productId, ...props } = docProps;
    return {
      ...core,
      ...props,
    } as TCore & TDocProps;
  });
}

export function extendProductMasters(
  cores: ProductMasterCore[],
  docProps: ProductMasterDocProps[],
): ProductMasterDoc[] {
  return extendProducts(cores, docProps, baseProductMasterDocProps);
}

export function extendProductSingles(
  cores: ProductSingleCore[],
  docProps: ProductSingleDocProps[], // Fixed type from ProductMasterDocProps
): ProductSingleDoc[] {
  return extendProducts(cores, docProps, baseProductSingleDocProps);
}

export function extendProductSubs(
  cores: ProductSubCore[],
  docProps: ProductSubDocProps[],
): ProductSubDoc[] {
  return extendProducts(cores, docProps, baseProductMasterDocProps);
}
