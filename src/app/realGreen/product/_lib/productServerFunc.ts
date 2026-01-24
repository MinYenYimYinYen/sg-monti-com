import {
  ProductCore,
  ProductDoc,
  ProductRaw,
} from "@/app/realGreen/product/ProductTypes";

function remapProduct(raw: ProductRaw): ProductCore {
  return {
    productId: raw.id,
    description: raw.description,
    isLabor: raw.isLabor,
    isMaster: raw.isMaster,
    isNonInventory: raw.isNonInventory,
    isProduction: raw.isProduction,
    isWorkOrder: raw.isWorkOrder,
    categoryId: raw.productCategoryId,
    productCode: raw.productCode,
    unitId: raw.unitofMeasure,
  };
}

export function remapProducts(raw: ProductRaw[]): ProductCore[] {
  return raw.map(remapProduct);
}

export async function extendProducts(
  remapped: ProductCore[],
): Promise<ProductDoc[]> {
  return remapped as ProductDoc[];
}
