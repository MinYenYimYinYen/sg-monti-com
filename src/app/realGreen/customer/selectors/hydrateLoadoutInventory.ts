import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { waterProduct, buildWaterUnitConfig } from "@/app/equipment/waterProduct";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { UnitLabel, VolumeUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";

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

  // Find the selected package for this master — explicit runtime selection takes priority.
  // Falls back to master.defaultPackage for consumers that don't provide packageSelections
  // (e.g. centralSelectors, forecasting). When neither is available, equipments is empty.
  const selection = packageSelections.find(
    (s) => s.masterProductId === master.productId,
  );

  const selectedPackage = selection
    ? master.equipmentPackages.find((p) => p.packageId === selection.selectedPackageId) ?? null
    : master.defaultPackage;

  if (!selectedPackage) {
    return buildMasterEntry({ master, size, equipmentEntries: [] });
  }

  // Build equipment entries from the selected package's hydrated equipment items
  const equipmentEntries: LoadoutBase["masters"][number]["equipments"] =
    selectedPackage.equipments.map((equipment: Equipment) => {
      // Water carrier: build per-equipment unit config based on showFlOz, then override
      // productCode/description with equipmentId so the UI labels the row by machine name.
      const waterUnitConfig = buildWaterUnitConfig(equipment.showFlOz);
      const mixProduct: ProductSub = {
        ...waterProduct,
        productCode: equipment.equipmentId,
        description: equipment.equipmentId,
        unitConfig: waterUnitConfig,
        unitConfigDisplay: new UnitConfigDisplay(waterUnitConfig),
      };

      // Mixed sub-products: those tagged with this equipment's ID on the master's sub-config.
      // Multiply by overlap because the label rate is a single-pass rate; with double overlap
      // the tech makes two passes over each unit area, so twice the product is consumed.
      const entrySubProducts = master.subProductConfigs
        .filter((config) => config.mixedByEquipmentIds.includes(equipment.equipmentId))
        .map((config) => ({
          productId: config.subProduct.productId,
          product: config.subProduct,
          plannedAmount: size * config.rate * equipment.appMethod.overlap,
          startAmount: null,
          finishAmount: null,
          unitId: config.subProduct.unit.unitId,
          unit: config.subProduct.unit,
        }));

      return {
        equipmentId: equipment.equipmentId,
        appMethod: equipment.appMethod,
        mixProductId: mixProduct.productId,
        mixProduct,
        mixProductUnitId: mixProduct.unit.unitId,
        mixProductUnit: mixProduct.unit,
        plannedAmount: calcPlannedWaterAmount(equipment.appMethod, size, equipment.showFlOz),
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

/**
 * calcPlannedWaterAmount — computes the total water volume needed for a job.
 *
 * Uses the AppMethod's solved coverage rate (volume per area) and the job size (ksf)
 * to derive the total volume in the water product's app unit (Fl Oz or Gal).
 *
 * Formula: plannedAmount = (coverage.volume / coverage.area) × jobAreaInCoverageUnit
 *
 * The result is expressed in the water product's app unit, which is determined by
 * showFlOz: true → Fl Oz, false → Gal. For granular methods the result stays in
 * the coverage's weight unit (Lbs).
 *
 * Guards against missing/zero coverage data (base objects use sentinel values like 0 or 1).
 */
function calcPlannedWaterAmount(
  appMethod: Equipment["appMethod"],
  size: number,
  showFlOz: boolean,
): number {
  const { coverage, productType } = appMethod;

  // Guard: missing or zero area means the AppMethod hasn't been properly configured
  if (!coverage.area || !coverage.areaUnit || !coverage.volumeUnit) return 0;

  // Scale job size (ksf) to the coverage's area unit, then apply the coverage rate.
  // The solver bakes overlap into coverage.volume (overlap effectively halves the pattern width),
  // so this correctly reflects the actual water applied per unit area including overlap.
  const sizeInCoverageAreaUnit = UnitUtils.area(size, UnitLabel.ksf).to(coverage.areaUnit);
  const volumeInCoverageUnit = (coverage.volume / coverage.area) * sizeInCoverageAreaUnit;

  if (productType === "granular") {
    // Granular: result stays in the coverage's weight unit (e.g. Lbs)
    return volumeInCoverageUnit;
  }

  // Liquid: convert from coverage's volume unit to the water product's app unit.
  // buildWaterUnitConfig sets app = Fl Oz when showFlOz, else Gal.
  const appUnit = showFlOz ? UnitLabel.flOz : UnitLabel.mGal;
  return UnitUtils.volume(
    volumeInCoverageUnit,
    coverage.volumeUnit as VolumeUnit["desc"],
  ).to(appUnit);
}

function buildMasterEntry(params: {
  master: ProductMaster;
  size: number;
  equipmentEntries: LoadoutBase["masters"][number]["equipments"];
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
    equipments: equipmentEntries,
    subProducts: fallbackSubProducts,
  };
}
