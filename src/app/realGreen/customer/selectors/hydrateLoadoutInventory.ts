import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { waterProduct } from "@/app/equipment/waterProduct";
import { Equipment } from "@/app/equipment/EquipmentTypes";

/**
 * getProductMasters — filters product rules by size and returns matching ProductMasters.
 * Moved here from hydrateProductsPlanned.ts (which is now deleted).
 */
export function getProductMasters(
  servCode: ServCode,
  size: number,
): ProductMaster[] {
  const productRules = servCode.productRules.filter((rule) => {
    const operator = rule.sizeOperator;
    switch (operator) {
      case "all":
        return true;
      case "lte":
        return size <= rule.size;
      case "gt":
        return size > rule.size;
    }
  });
  if (productRules.length === 0) return [];
  return productRules.flatMap((rule) => rule.productMasters);
}

/**
 * PackageSelection — the worker's choice of equipment package for a given master product.
 * Stored in Redux loadoutFormSlice.packageSelections.
 */
export type PackageSelection = {
  masterProductId: number;
  selectedPackageId: string;
};

export function hydrateLoadoutInventory(params: {
  servDoc: ServiceDoc;
  servCodeMap: Map<string, ServCode>;
  packageSelections?: PackageSelection[];
}): LoadoutBase {
  const { servDoc, servCodeMap, packageSelections = [] } = params;

  const servCode = servCodeMap.get(servDoc.servCodeId);
  if (!servCode) return { masters: [], singles: [], subProducts: [] };

  const productMasters = getProductMasters(servCode, servDoc.size);

  const masters = productMasters.map((master: ProductMaster) =>
    hydrateMasterInventory({
      master,
      size: servDoc.size,
      packageSelections,
    }),
  );

  return { masters, singles: [], subProducts: [] };
}

function hydrateMasterInventory(params: {
  master: ProductMaster;
  size: number;
  packageSelections: PackageSelection[];
}): LoadoutBase["masters"][number] {
  const { master, size, packageSelections } = params;

  // Find the selected package for this master
  const selection = packageSelections.find(
    (s) => s.masterProductId === master.productId,
  );

  // If no package selected → equipmentEntries is empty (UI will prompt for selection)
  if (!selection) {
    return buildMasterEntry({ master, size, equipmentEntries: [] });
  }

  const selectedPackage = master.equipmentPackages.find(
    (p) => p.packageId === selection.selectedPackageId,
  );

  // Package not found (stale selection) → empty entries
  if (!selectedPackage) {
    return buildMasterEntry({ master, size, equipmentEntries: [] });
  }

  // Build equipment entries from the selected package's hydrated equipment items
  const equipmentEntries: LoadoutBase["masters"][number]["equipmentEntries"] =
    selectedPackage.equipments.map((entry: Equipment) => {
      // Water carrier: use waterProduct constant, override productCode/description with equipmentId
      const mixProduct: ProductSub = {
        ...waterProduct,
        productCode: entry.equipmentId,
        description: entry.equipmentId,
      };

      // Mixed sub-products: those tagged with this equipment's ID on the master's sub-config
      const entrySubProducts = master.subProductConfigs
        .filter((config) => config.mixedByEquipmentIds.includes(entry.equipmentId))
        .map((config) => ({
          productId: config.subProduct.productId,
          product: config.subProduct,
          plannedAmount: size * config.rate,
          startAmount: null,
          finishAmount: null,
          unitId: config.subProduct.unit.unitId,
          unit: config.subProduct.unit,
        }));

      return {
        equipmentId: entry.equipmentId,
        appMethod: entry.appMethod,
        mixProductId: mixProduct.productId,
        mixProduct,
        mixProductUnitId: mixProduct.unit.unitId,
        mixProductUnit: mixProduct.unit,
        plannedAmount:
          (size * entry.appMethod.flowRate.volume) /
          entry.appMethod.flowRate.time,
        startAmount: null,
        finishAmount: null,
        subProducts: entrySubProducts,
      };
    });

  // Standalone sub-products (not tagged to any equipment) go to master.subProducts
  const nonClaimedSubProducts = master.subProductConfigs
    .filter((config) => config.mixedByEquipmentIds.length === 0)
    .map((config) => ({
      productId: config.subProduct.productId,
      product: config.subProduct,
      plannedAmount: size * config.rate,
      startAmount: null,
      finishAmount: null,
      unitId: config.subProduct.unit.unitId,
      unit: config.subProduct.unit,
    }));

  return buildMasterEntry({
    master,
    size,
    equipmentEntries,
    subProducts: nonClaimedSubProducts,
  });
}

function buildMasterEntry(params: {
  master: ProductMaster;
  size: number;
  equipmentEntries: LoadoutBase["masters"][number]["equipmentEntries"];
  subProducts?: LoadoutBase["masters"][number]["subProducts"];
}): LoadoutBase["masters"][number] {
  const { master, size, equipmentEntries, subProducts } = params;

  // When no package selected, all sub-products go to master.subProducts
  const fallbackSubProducts =
    subProducts ??
    master.subProductConfigs.map((config) => ({
      productId: config.subProduct.productId,
      product: config.subProduct,
      plannedAmount: size * config.rate,
      startAmount: null,
      finishAmount: null,
      unitId: config.subProduct.unit.unitId,
      unit: config.subProduct.unit,
    }));

  return {
    productId: master.productId,
    product: master,
    plannedAmount: size,
    startAmount: null,
    finishAmount: null,
    unitId: master.unit.unitId,
    unit: master.unit,
    equipmentEntries,
    subProducts: fallbackSubProducts,
  };
}
