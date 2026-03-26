import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { EquipmentPackage } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

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
 * Finds all products that reference a specific appMethodId via their equipment packages.
 * Used for showing impact before deleting an AppMethod.
 */
export function getAffectedProducts(
  appMethodId: string,
  productMasters: ProductMaster[],
): AffectedProduct[] {
  const affected: AffectedProduct[] = [];

  for (const master of productMasters) {
    // Check if any hydrated equipment package's equipment items reference this appMethodId
    const hasMatch = master.equipmentPackages.some((pkg: EquipmentPackage) =>
      pkg.equipments.some((e: Equipment) => e.appMethodId === appMethodId),
    );

    if (hasMatch) {
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
