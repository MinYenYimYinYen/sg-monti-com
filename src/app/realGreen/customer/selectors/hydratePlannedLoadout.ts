import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { LoadoutBase } from "@/app/loadout/LoadoutTypes";
import { LoadoutConstituent, Mixture } from "@/app/loadout/Mixture";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import {
  waterProduct,
  buildWaterUnitConfig,
} from "@/app/equipment/waterProduct";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import {
  UnitLabel,
  UL_METRIC_MAP,
  VolumeUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";

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

let hasDebugged = false;

export function hydratePlannedLoadout(params: {
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
      debug: false // !hasDebugged && servDoc.size === 10,
    }),
  );

  if (servDoc.size === 10) hasDebugged = true;

  return { masters, singles: [], subProducts: [] };
}

function hydrateMasterInventory(params: {
  master: ProductMaster;
  size: number;
  packageSelections: PackageSelection[];
  debug: boolean;
}): LoadoutBase["masters"][number] {
  const { master, size, packageSelections, debug } = params;

  // Find the selected package for this master — explicit runtime selection takes priority.
  // Falls back to master.defaultPackage for consumers that don't provide packageSelections
  // (e.g. centralSelectors, forecasting). When neither is available, equipments is empty.
  const selection = packageSelections.find(
    (s) => s.masterProductId === master.productId,
  );

  const selectedPackage = selection
    ? (master.equipmentPackages.find(
        (p) => p.packageId === selection.selectedPackageId,
      ) ?? null)
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
      const carrierProduct: ProductSub = {
        ...waterProduct,
        productCode: equipment.equipmentId,
        description: equipment.equipmentId,
        unitConfig: waterUnitConfig,
        unitConfigDisplay: new UnitConfigDisplay(waterUnitConfig),
      };

      // Solute constituents: sub-products tagged to this equipment.
      // plannedAmount = label rate × overlap × job size — total chemical applied
      // over the whole job across all passes.
      const soluteConstituents: LoadoutConstituent[] = master.subProductConfigs
        .filter((config) =>
          config.mixedByEquipmentIds.includes(equipment.equipmentId),
        )
        .map((config) => {
          if (debug) {
            console.log("config", config);
          }
          return {
            product: config.subProduct,
            ratePerKsf: config.rate,
            plannedAmount: size * config.rate,
            startAmount: null,
            finishAmount: null,
            unitId: config.subProduct.unit.unitId,
            unit: config.subProduct.unit,
          };
        });

      if (debug) {
        soluteConstituents.forEach((constituent) =>
          console.log(
            constituent.product.productCode,
            constituent.plannedAmount,
            "size:",
            size,
          ),
        );
      }

      // Total mix volume (Fl Oz) from AppMethod coverage rate × job size.
      // The AppMethod's flow rate is the sum of ALL constituents (water + solutes).
      const totalMixFlOz = calcTotalMixFlOz(equipment.appMethod, size);

      // Water-only volume (Fl Oz) = total mix − sum of volumetric solute volumes.
      // Only subtract solutes with a volume metric — weight/count solutes don't displace liquid.
      const soluteVolumeFlOz = soluteConstituents.reduce((sum, solute) => {
        const metric =
          UL_METRIC_MAP[solute.unit.desc as keyof typeof UL_METRIC_MAP];
        if (metric !== "volume") return sum;
        return (
          sum +
          UnitUtils.volume(
            solute.plannedAmount,
            solute.unit.desc as VolumeUnit["desc"],
          ).to(UnitLabel.flOz)
        );
      }, 0);

      const waterFlOz = totalMixFlOz - soluteVolumeFlOz;

      // Convert water volume to the carrier's app unit (Gal or Fl Oz per showFlOz).
      const carrierAppUnit = equipment.showFlOz
        ? UnitLabel.flOz
        : UnitLabel.mGal;
      const waterPlannedAmount = UnitUtils.volume(waterFlOz, UnitLabel.flOz).to(
        carrierAppUnit,
      );

      // Convert total mix to Gal for equipment.plannedAmount (used by MixWizard slider).
      const totalMixGal = UnitUtils.volume(totalMixFlOz, UnitLabel.flOz).to(
        UnitLabel.mGal,
      );

      // Water carrier constituent — always first in the constituents array.
      // plannedAmount = water-only volume in the carrier's app unit.
      const carrierConstituent: LoadoutConstituent = {
        product: carrierProduct,
        ratePerKsf: 0,
        plannedAmount: waterPlannedAmount,
        startAmount: null,
        finishAmount: null,
        unitId: carrierProduct.unit.unitId,
        unit: carrierProduct.unit,
      };

      const plannedMixture = new Mixture([carrierConstituent, ...soluteConstituents]);

      return {
        equipmentId: equipment.equipmentId,
        appMethod: equipment.appMethod,
        plannedAmount: totalMixGal,
        startAmount: null,
        finishAmount: null,
        constituents: [carrierConstituent, ...soluteConstituents],
        plannedMixture,
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
 * calcTotalMixFlOz — computes the total mix volume (Fl Oz) for a job.
 *
 * The AppMethod's coverage rate (volume per area) represents the total flow rate —
 * the sum of ALL constituents (water + solutes) dispensed per unit area. Overlap is
 * already baked into coverage.volume by the AppMethod solver.
 *
 * Returns 0 for granular methods or unconfigured AppMethods.
 */
function calcTotalMixFlOz(
  appMethod: Equipment["appMethod"],
  size: number,
): number {
  const { coverage, productType } = appMethod;

  if (productType === "granular") return 0;
  if (!coverage.area || !coverage.areaUnit || !coverage.volumeUnit) return 0;

  const sizeInCoverageAreaUnit = UnitUtils.area(size, UnitLabel.ksf).to(
    coverage.areaUnit,
  );
  const volumeInCoverageUnit =
    (coverage.volume / coverage.area) * sizeInCoverageAreaUnit;

  return UnitUtils.volume(
    volumeInCoverageUnit,
    coverage.volumeUnit as VolumeUnit["desc"],
  ).to(UnitLabel.flOz);
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
