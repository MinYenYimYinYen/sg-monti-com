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
 * Finds all products that reference a specific appMethodId via their equipmentScenarios.
 * Used for showing impact before deleting an AppMethod.
 */
export function getAffectedProducts(
  appMethodId: string,
  productMasters: ProductMaster[],
): AffectedProduct[] {
  const affected: AffectedProduct[] = [];

  for (const master of productMasters) {
    // Check if any equipmentScenario's entries reference this appMethodId
    const hasScenario = master.equipmentScenarioDocs.some((s) =>
      s.equipmentEntries.some((e) => e.appMethodId === appMethodId),
    );

    if (hasScenario) {
      // Report all sub-configs as potentially affected (the whole master uses this method)
      const affectedSubConfigs = master.subProductConfigs.map((config) => ({
        subId: config.subId,
        subDescription:
          config.subProduct?.description || `Sub ID: ${config.subId}`,
        storedRate: config.storedRate,
        hasZeroRate: config.storedRate === 0,
      }));

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
