import {
  ProductCore,
  ProductDoc,
  ProductDocProps,
  ProductRaw,
} from "@/app/realGreen/product/_lib/ProductTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapProduct(raw: ProductRaw): ProductCore {
  return {
    productId: raw.id,
    description: raw.description,
    isLabor: raw.isLabor,
    isMaster: raw.isMaster,
    isNonInventory: raw.isNonInventory,
    isProduction: raw.isProduction,
    isMobile: raw.availableOnHandheld,
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
  return extendEntities<ProductCore, ProductDocProps, ProductDoc>({
    cores: remapped,
    idField: "productId",
    baseDocProps: {} as ProductDocProps,
  });
}
