import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { waterProduct } from "@/app/equipment/waterProduct";
import { EquipmentEntry } from "@/app/equipment/EquipmentTypes";

/**
 * getProductMasters — filters product rules by size and returns matching ProductMasters.
 * Moved here from hydrateProductsPlanned.ts (which is now deleted).
 */
export function getProductMasters(servCode: ServCode, size: number): ProductMaster[] {
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
 * ScenarioSelection — the worker's choice of scenario for a given master product.
 * Stored in Redux loadoutFormSlice.scenarioSelections.
 */
export type ScenarioSelection = {
  masterProductId: number;
  selectedScenarioId: string;
};

export function hydrateLoadoutInventory(params: {
  servDoc: ServiceDoc;
  servCodeMap: Map<string, ServCode>;
  scenarioSelections?: ScenarioSelection[];
}): LoadoutBase {
  const { servDoc, servCodeMap, scenarioSelections = [] } = params;

  const servCode = servCodeMap.get(servDoc.servCodeId);
  if (!servCode) return { masters: [], singles: [], subProducts: [] };

  const productMasters = getProductMasters(servCode, servDoc.size);

  const masters = productMasters.map((master: ProductMaster) =>
    hydrateMasterInventory({
      master,
      size: servDoc.size,
      scenarioSelections,
    }),
  );

  return { masters, singles: [], subProducts: [] };
}

function hydrateMasterInventory(params: {
  master: ProductMaster;
  size: number;
  scenarioSelections: ScenarioSelection[];
}): LoadoutBase["masters"][number] {
  const { master, size, scenarioSelections } = params;

  // Find the selected scenario for this master
  const selection = scenarioSelections.find(
    (s) => s.masterProductId === master.productId,
  );

  // If no scenario selected → equipmentEntries is empty (UI will prompt for selection)
  if (!selection) {
    return buildMasterEntry({ master, size, equipmentEntries: [] });
  }

  const selectedScenario = master.equipmentScenarios.find(
    (s) => s.scenarioId === selection.selectedScenarioId,
  );

  // Scenario not found (stale selection) → empty entries
  if (!selectedScenario) {
    return buildMasterEntry({ master, size, equipmentEntries: [] });
  }

  // Build the set of product IDs claimed by any equipment entry
  const claimedProductIds = new Set<number>(
    selectedScenario.equipmentEntries.flatMap((e) => e.mixedProductIds),
  );

  // Build equipment entries — selectedScenario.equipmentEntries are EquipmentEntry (hydrated)
  const equipmentEntries: LoadoutBase["masters"][number]["equipmentEntries"] =
    (selectedScenario.equipmentEntries as EquipmentEntry[]).map((entry) => {
      // Water carrier: use waterProduct constant, override productCode/description with equipmentId
      const mixProduct: ProductSub = {
        ...waterProduct,
        productCode: entry.equipmentId,
        description: entry.equipmentId,
      };

      // Mixed sub-products for this entry
      const entrySubProducts = master.subProductConfigs
        .filter((config) => entry.mixedProductIds.includes(config.subId))
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
        plannedAmount: size * entry.waterRate,
        startAmount: null,
        finishAmount: null,
        subProducts: entrySubProducts,
      };
    });

  // Non-claimed sub-products go to master.subProducts
  const nonClaimedSubProducts = master.subProductConfigs
    .filter((config) => !claimedProductIds.has(config.subId))
    .map((config) => ({
      productId: config.subProduct.productId,
      product: config.subProduct,
      plannedAmount: size * config.rate,
      startAmount: null,
      finishAmount: null,
      unitId: config.subProduct.unit.unitId,
      unit: config.subProduct.unit,
    }));

  return buildMasterEntry({ master, size, equipmentEntries, subProducts: nonClaimedSubProducts });
}

function buildMasterEntry(params: {
  master: ProductMaster;
  size: number;
  equipmentEntries: LoadoutBase["masters"][number]["equipmentEntries"];
  subProducts?: LoadoutBase["masters"][number]["subProducts"];
}): LoadoutBase["masters"][number] {
  const { master, size, equipmentEntries, subProducts } = params;

  // When no scenario selected, all sub-products go to master.subProducts
  const fallbackSubProducts = subProducts ?? master.subProductConfigs.map((config) => ({
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
