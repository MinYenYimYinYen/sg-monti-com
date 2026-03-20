import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export interface AffectedProduct {
  productId: number;
  productCode: string;
  description: string;
  affectedSubConfigs: Array<{
    subId: number;
    subDescription: string;
    storedRate: number;
    hasZeroRate: boolean;
  }>;
}

/**
 * Finds all products that reference a specific appMethodId.
 * Used for showing impact before deleting an AppMethod.
 */
export function getAffectedProducts(
  appMethodId: string,
  productMasters: ProductMaster[],
): AffectedProduct[] {
  const affected: AffectedProduct[] = [];

  for (const master of productMasters) {
    const affectedSubConfigs = master.subProductConfigs
      .filter((config) => config.appMethodId === appMethodId)
      .map((config) => ({
        subId: config.subId,
        subDescription: config.subProduct?.description || `Sub ID: ${config.subId}`,
        storedRate: config.storedRate,
        hasZeroRate: config.storedRate === 0,
      }));

    if (affectedSubConfigs.length > 0) {
      affected.push({
        productId: master.productId,
        productCode: master.productCode,
        description: master.description,
        affectedSubConfigs,
      });
    }
  }

  return affected;
}
