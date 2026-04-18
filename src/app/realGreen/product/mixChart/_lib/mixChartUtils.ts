import { ProductMaster, SubProductConfig } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { CompoundUnitDisplay, UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { UnitContext } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { EquipmentPackage } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { LoadoutConstituent, Mixture } from "@/app/loadout/Mixture";
import { waterProduct, buildWaterUnitConfig } from "@/app/equipment/waterProduct";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { UnitLabel, UL_METRIC_MAP, VolumeUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";

export type MixChartAmount = CompoundUnitDisplay;

export type MixChartRow = {
  size: number;
  amounts: MixChartAmount[];
};

/**
 * A constituent column in the mix chart — either the water carrier or a chemical solute.
 * Used as the column descriptor for both chart layouts.
 */
export type MixChartConstituent = {
  /** Display label for the column header. */
  label: string;
  isWater: boolean;
  /** The unit config display used to format amounts for this constituent. */
  unitConfigDisplay: UnitConfigDisplay;
  /** Rate per ksf in the constituent's app unit. For water: water-only Gal (or FlOz) per ksf. */
  ratePerKsf: number;
  /** The sub-product config for solutes; null for water. */
  subProductConfig: SubProductConfig | null;
};

/**
 * One equipment item's section in the mix chart.
 * Contains the water carrier column followed by all solute columns for that equipment.
 */
export type MixChartEquipmentGroup = {
  equipment: Equipment;
  /** constituents[0] = water carrier, constituents[1..n] = solutes for this equipment. */
  constituents: MixChartConstituent[];
};

// ---------------------------------------------------------------------------
// Internal helpers (mirrors hydratePlannedLoadout logic)
// ---------------------------------------------------------------------------

/**
 * Computes total mix volume in Fl Oz for a given size (ksf) using the AppMethod coverage rate.
 * Returns 0 for granular methods or unconfigured AppMethods.
 */
function calcTotalMixFlOz(appMethod: Equipment["appMethod"], size: number): number {
  const { coverage, productType } = appMethod;
  if (productType === "granular") return 0;
  if (!coverage.area || !coverage.areaUnit || !coverage.volumeUnit) return 0;

  const sizeInCoverageAreaUnit = UnitUtils.area(size, UnitLabel.ksf).to(coverage.areaUnit);
  const volumeInCoverageUnit = (coverage.volume / coverage.area) * sizeInCoverageAreaUnit;
  return UnitUtils.volume(volumeInCoverageUnit, coverage.volumeUnit as VolumeUnit["desc"]).to(UnitLabel.flOz);
}

/**
 * Builds a Mixture for a given equipment + master at a unit size of 1 ksf.
 * Used internally to derive per-ksf rates for each constituent.
 */
function buildMixtureForEquipment(
  equipment: Equipment,
  master: ProductMaster,
  size: number,
): Mixture {
  const waterUnitConfig = buildWaterUnitConfig(equipment.showFlOz);
  const carrierProduct: ProductSub = {
    ...waterProduct,
    productCode: equipment.equipmentId,
    description: equipment.description,
    unitConfig: waterUnitConfig,
    unitConfigDisplay: new UnitConfigDisplay(waterUnitConfig),
  };

  const soluteConstituents: LoadoutConstituent[] = master.subProductConfigs
    .filter((config) => config.mixedByEquipmentIds.includes(equipment.equipmentId))
    .map((config) => ({
      product: config.subProduct,
      ratePerKsf: config.rate,
      plannedAmount: size * config.rate,
      startAmount: null,
      finishAmount: null,
      unitId: config.subProduct.unit.unitId,
      unit: config.subProduct.unit,
    }));

  const totalMixFlOz = calcTotalMixFlOz(equipment.appMethod, size);

  const soluteVolumeFlOz = soluteConstituents.reduce((sum, solute) => {
    const metric = UL_METRIC_MAP[solute.unit.desc as keyof typeof UL_METRIC_MAP];
    if (metric !== "volume") return sum;
    return sum + UnitUtils.volume(solute.plannedAmount, solute.unit.desc as VolumeUnit["desc"]).to(UnitLabel.flOz);
  }, 0);

  const waterFlOz = totalMixFlOz - soluteVolumeFlOz;
  const carrierAppUnit = equipment.showFlOz ? UnitLabel.flOz : UnitLabel.mGal;
  const waterPlannedAmount = UnitUtils.volume(waterFlOz, UnitLabel.flOz).to(carrierAppUnit);

  const carrierConstituent: LoadoutConstituent = {
    product: carrierProduct,
    ratePerKsf: 0,
    plannedAmount: waterPlannedAmount,
    startAmount: null,
    finishAmount: null,
    unitId: carrierProduct.unit.unitId,
    unit: carrierProduct.unit,
  };

  return new Mixture([carrierConstituent, ...soluteConstituents]);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the equipment group descriptors for the mix chart from a selected package.
 *
 * Returns null when no package is selected or the package has no equipment,
 * which signals the chart to fall back to the old chemical-only layout.
 *
 * Each group contains:
 *   - constituents[0]: water carrier column (ratePerKsf = water-only Gal per ksf)
 *   - constituents[1..n]: solute columns for that equipment
 */
export function buildMixChartGroups(
  master: ProductMaster,
  selectedPackageId: string | null,
): MixChartEquipmentGroup[] | null {
  if (!selectedPackageId) return null;

  const pkg: EquipmentPackage | undefined = master.equipmentPackages.find(
    (p) => p.packageId === selectedPackageId,
  );
  if (!pkg || pkg.equipments.length === 0) return null;

  // Use size = 1 ksf to derive per-ksf rates from the Mixture.
  const unitSize = 1;

  return pkg.equipments.map((equipment) => {
    const mixture = buildMixtureForEquipment(equipment, master, unitSize);
    const scaled = mixture.scaleMixture(1); // ratio = 1 → amounts are per-ksf

    const waterUnitConfig = buildWaterUnitConfig(equipment.showFlOz);
    const waterUnitConfigDisplay = new UnitConfigDisplay(waterUnitConfig);

    const waterConstituent: MixChartConstituent = {
      label: `Water (${equipment.description})`,
      isWater: true,
      unitConfigDisplay: waterUnitConfigDisplay,
      // scaled[0] is the carrier; amount is in the carrier's app unit per ksf
      ratePerKsf: scaled[0].amount,
      subProductConfig: null,
    };

    const soluteConfigs = master.subProductConfigs.filter((config) =>
      config.mixedByEquipmentIds.includes(equipment.equipmentId),
    );

    const soluteConstituents: MixChartConstituent[] = soluteConfigs.map((config, idx) => ({
      label: config.subProduct.description,
      isWater: false,
      unitConfigDisplay: config.subProduct.unitConfigDisplay,
      // scaled[idx + 1] corresponds to the solute at position idx+1 in the Mixture
      ratePerKsf: scaled[idx + 1]?.amount ?? config.rate * unitSize,
      subProductConfig: config,
    }));

    return {
      equipment,
      constituents: [waterConstituent, ...soluteConstituents],
    };
  });
}

/**
 * Single source of truth for product amount calculations.
 * Given a size and sub-product config, calculates the application amount.
 */
export function calculateAmountNeeded({ size, rate }: { size: number; rate: number }): number {
  return size * rate;
}

/**
 * Inverse calculation: given amount and rate, calculate size covered.
 */
export function calculateSizeCovered({ appAmount, rate }: { appAmount: number; rate: number }): number {
  return appAmount / rate;
}

// ---------------------------------------------------------------------------
// Chart by Size
// ---------------------------------------------------------------------------

export type MixChartEquipmentGroupRow = {
  equipment: Equipment;
  /** amounts[0] = water, amounts[1..n] = solutes for this equipment. */
  amounts: MixChartAmount[];
};

export type MixChartRowWithGroups = {
  size: number;
  /** Present when a package is selected. */
  equipmentGroupRows: MixChartEquipmentGroupRow[];
  /** Present when no package is selected (fallback). */
  amounts: MixChartAmount[];
};

/**
 * Generates mix chart data (chart by size).
 *
 * When `groups` is null (no package selected), falls back to the old behavior:
 * one column per sub-product config, no water.
 *
 * When `groups` is provided, columns are grouped by equipment with water first.
 */
export function generateMixChartData(
  master: ProductMaster,
  increment: number,
  maxSize: number,
  groups: MixChartEquipmentGroup[] | null,
): MixChartRowWithGroups[] {
  const sizes: number[] = [];
  for (let size = increment; size <= maxSize; size += increment) {
    sizes.push(size);
  }

  if (!groups) {
    // Fallback: chemical columns only (old behavior)
    return sizes.map((size) => ({
      size,
      equipmentGroupRows: [],
      amounts: master.subProductConfigs.map((config) => {
        const appAmount = calculateAmountNeeded({ size, rate: config.rate });
        return config.subProduct.unitConfigDisplay.format({
          amount: appAmount,
          targetContexts: ["load", "app"],
        });
      }),
    }));
  }

  return sizes.map((size) => {
    const equipmentGroupRows: MixChartEquipmentGroupRow[] = groups.map((group) => {
      const amounts: MixChartAmount[] = group.constituents.map((constituent) => {
        const amount = constituent.ratePerKsf * size;
        return constituent.unitConfigDisplay.format({
          amount,
          targetContexts: ["load", "app"],
        });
      });
      return { equipment: group.equipment, amounts };
    });

    return {
      size,
      equipmentGroupRows,
      amounts: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Chart by Product Amount
// ---------------------------------------------------------------------------

export type MixChartByProductAmountRow = {
  amount: number;
  unit: string;
  sizeCovered: number;
  /** Amounts for all OTHER constituents (not the key constituent). */
  amounts: MixChartAmount[];
  /** When groups are present, amounts are grouped by equipment. */
  equipmentGroupRows: MixChartEquipmentGroupRow[];
};

/**
 * Identifies a constituent in the mix chart — either a water row (by equipmentId)
 * or a chemical solute (by subId).
 */
export type MixChartConstituentKey =
  | { type: "water"; equipmentId: string }
  | { type: "solute"; subId: number };

/**
 * Generates mix chart data keyed on a specific constituent (chart by product amount).
 *
 * When `groups` is null, falls back to old behavior (chemical sub-products only).
 * When `groups` is provided, the key constituent can be water or a solute.
 */
export function generateMixChartByProductAmount(
  master: ProductMaster,
  selectedKey: MixChartConstituentKey,
  increment: number,
  maxUnits: number,
  unitContext: UnitContext = "load",
  groups: MixChartEquipmentGroup[] | null,
): MixChartByProductAmountRow[] {
  const units: number[] = [];
  for (let unit = increment; unit <= maxUnits; unit += increment) {
    units.push(unit);
  }

  if (!groups) {
    // Fallback: old behavior — key must be a solute
    if (selectedKey.type !== "solute") return [];

    const selectedConfig = master.subProductConfigs.find(
      (config) => config.subId === selectedKey.subId,
    );
    if (!selectedConfig) return [];

    const conversion = selectedConfig.subProduct.unitConfig.conversions[unitContext];

    return units.map((amount) => {
      const appAmount = amount * conversion.conversionFactor;
      const sizeCovered = calculateSizeCovered({ appAmount, rate: selectedConfig.rate });

      const amounts = master.subProductConfigs
        .filter((config) => config.subId !== selectedKey.subId)
        .map((config) => {
          const requiredAppAmount = calculateAmountNeeded({ size: sizeCovered, rate: config.rate });
          return config.subProduct.unitConfigDisplay.format({
            amount: requiredAppAmount,
            targetContexts: ["load", "app"],
          });
        });

      return {
        amount,
        unit: conversion.unitLabel,
        sizeCovered,
        amounts,
        equipmentGroupRows: [],
      };
    });
  }

  // Find the key constituent across all groups
  let keyConstituent: MixChartConstituent | null = null;
  for (const group of groups) {
    for (const constituent of group.constituents) {
      if (
        selectedKey.type === "water" &&
        constituent.isWater &&
        group.equipment.equipmentId === selectedKey.equipmentId
      ) {
        keyConstituent = constituent;
        break;
      }
      if (
        selectedKey.type === "solute" &&
        !constituent.isWater &&
        constituent.subProductConfig?.subId === selectedKey.subId
      ) {
        keyConstituent = constituent;
        break;
      }
    }
    if (keyConstituent) break;
  }

  if (!keyConstituent || keyConstituent.ratePerKsf === 0) return [];

  const conversion = keyConstituent.unitConfigDisplay["unitConfig"].conversions[unitContext];

  return units.map((amount) => {
    const appAmount = amount * conversion.conversionFactor;
    const sizeCovered = calculateSizeCovered({ appAmount, rate: keyConstituent!.ratePerKsf });

    // Build "other" amounts grouped by equipment, excluding the key constituent
    const equipmentGroupRows: MixChartEquipmentGroupRow[] = groups.map((group) => {
      const amounts: MixChartAmount[] = group.constituents
        .filter((constituent) => {
          if (
            selectedKey.type === "water" &&
            constituent.isWater &&
            group.equipment.equipmentId === selectedKey.equipmentId
          ) {
            return false;
          }
          if (
            selectedKey.type === "solute" &&
            !constituent.isWater &&
            constituent.subProductConfig?.subId === selectedKey.subId
          ) {
            return false;
          }
          return true;
        })
        .map((constituent) => {
          const requiredAmount = constituent.ratePerKsf * sizeCovered;
          return constituent.unitConfigDisplay.format({
            amount: requiredAmount,
            targetContexts: ["load", "app"],
          });
        });
      return { equipment: group.equipment, amounts };
    });

    return {
      amount,
      unit: conversion.unitLabel,
      sizeCovered,
      amounts: [],
      equipmentGroupRows,
    };
  });
}
