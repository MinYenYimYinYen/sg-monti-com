import {
  ProductCommonDoc,
  ProductCommonDocProps,
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
  ProductSingleDocProps,
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
  baseProductSubDocProps,
} from "@/app/realGreen/product/_lib/baseProduct";
import { ProductCategoryStored } from "@/app/realGreen/product/_lib/types/ProductCategoryTypes";
import { baseUnit, Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export function remapRawProducts(raw: ProductRaw[]) {
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
      categoryId: p.productCategoryId || baseNumId,
      productCode: p.productCode,
      unitId: p.unitofMeasure === null ? baseNumId : p.unitofMeasure,
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

export function extendProducts<
  TCore extends { productId: number; categoryId: number; unitId: number },
  TDocProps extends { productId: number; category: string; unit: Unit },
>({
  cores,
  docProps,
  baseDocProps,
  categoryMap,
  unitMap,
}: {
  cores: TCore[];
  docProps: TDocProps[];
  baseDocProps: TDocProps;
  categoryMap: Map<number, ProductCategoryStored>;
  unitMap: Map<number, Unit>;
}): (TCore & TDocProps)[] {
  const docPropsMap = new Grouper(docProps).toUniqueMap((p) => p.productId);
  return cores.map((core) => {
    const docProps = docPropsMap.get(core.productId) || baseDocProps;
    const { productId, ...props } = docProps;
    return {
      ...core,
      ...props,
      category:
        categoryMap.get(core.categoryId)?.category ||
        core.categoryId?.toString() ||
        baseStrId,
      unit: unitMap.get(core.unitId) || {
        ...baseUnit,
        unitId: core.unitId,
      },
    } as TCore & TDocProps;
  });
}

export function extendProductMasters(
  cores: ProductMasterCore[],
  docProps: ProductMasterDocProps[],
  categoryMap: Map<number, ProductCategoryStored>,
  unitMap: Map<number, Unit>,
): ProductMasterDoc[] {
  return extendProducts({
    cores,
    docProps,
    baseDocProps: baseProductMasterDocProps,
    categoryMap,
    unitMap,
  });
}

export function extendProductSingles(
  cores: ProductSingleCore[],
  docProps: ProductSingleDocProps[],
  categoryMap: Map<number, ProductCategoryStored>,
  unitMap: Map<number, Unit>,
): ProductSingleDoc[] {
  return extendProducts({
    cores,
    docProps,
    baseDocProps: baseProductSingleDocProps,
    categoryMap,
    unitMap,
  });
}

export function extendProductSubs(
  cores: ProductSubCore[],
  docProps: ProductSubDocProps[],
  categoryMap: Map<number, ProductCategoryStored>,
  unitMap: Map<number, Unit>,
): ProductSubDoc[] {
  return extendProducts({
    cores,
    docProps,
    baseDocProps: baseProductSubDocProps,
    categoryMap,
    unitMap,
  });
}

export function extendProductCores(
  cores: ProductCore[],
  docProps: ProductCommonDocProps[],
  categoryMap: Map<number, ProductCategoryStored>,
  unitMap: Map<number, Unit>,
): ProductCommonDoc[] {
  return extendProducts({
    cores,
    docProps,
    baseDocProps: baseProductMasterDocProps,
    categoryMap,
    unitMap,
  });
}
