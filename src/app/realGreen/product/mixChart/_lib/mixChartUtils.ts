import { CompoundUnitDisplay, UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { UnitContext } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { AppMethodResult } from "@/app/appMethod/appMethodSolver/AppMethodSolverTypes";
import { MixChartProductRow } from "@/app/realGreen/product/mixChart/_lib/MixChartTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { UnitLabel, VolumeUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { buildWaterUnitConfig } from "@/app/equipment/waterProduct";

export type MixChartAmount = CompoundUnitDisplay;

// ---------------------------------------------------------------------------
// Water rate derivation
// ---------------------------------------------------------------------------

/**
 * Computes total mix volume in Fl Oz for a given size (ksf) using the AppMethod coverage rate.
 * Returns 0 for granular methods or unconfigured AppMethods.
 */
function calcTotalMixFlOz(appMethod: AppMethodResult, size: number): number {
  const { coverage, productType } = appMethod;
  if (productType === "granular") return 0;
  if (!coverage.area || !coverage.areaUnit || !coverage.volumeUnit) return 0;

  const sizeInCoverageAreaUnit = UnitUtils.area(size, UnitLabel.ksf).to(coverage.areaUnit);
  const volumeInCoverageUnit = (coverage.volume / coverage.area) * sizeInCoverageAreaUnit;
  return UnitUtils.volume(volumeInCoverageUnit, coverage.volumeUnit as VolumeUnit["desc"]).to(UnitLabel.flOz);
}

/**
 * Derives the water-only rate per ksf (in the carrier's app unit) from the effective AppMethod.
 *
 * The total mix volume from the AppMethod coverage rate includes all constituents.
 * We subtract the volumetric product rows to get the water-only volume.
 *
 * Returns null if the AppMethod is granular or unconfigured.
 */
export function calcWaterRatePerKsf(
  appMethod: AppMethodResult,
  products: MixChartProductRow[],
  showFlOz: boolean,
): number | null {
  const unitSize = 1; // 1 ksf reference size
  const totalMixFlOz = calcTotalMixFlOz(appMethod, unitSize);
  if (totalMixFlOz === 0) return null;

  // Subtract volumetric product rows (those whose app unit is a volume unit)
  const soluteVolumeFlOz = products.reduce((sum, row) => {
    const appUnitLabel = row.unitConfigDisplay.getUnitLabel("app");
    // Only subtract volume-metric products
    if (appUnitLabel !== UnitLabel.mGal && appUnitLabel !== UnitLabel.flOz) return sum;
    const soluteFlOz = UnitUtils.volume(row.rate * unitSize, appUnitLabel as VolumeUnit["desc"]).to(UnitLabel.flOz);
    return sum + soluteFlOz;
  }, 0);

  const waterFlOz = totalMixFlOz - soluteVolumeFlOz;
  const carrierAppUnit = showFlOz ? UnitLabel.flOz : UnitLabel.mGal;
  return UnitUtils.volume(waterFlOz, UnitLabel.flOz).to(carrierAppUnit);
}

/**
 * Returns the UnitConfigDisplay for the water carrier based on equipment.showFlOz.
 */
export function buildWaterUnitConfigDisplay(showFlOz: boolean): UnitConfigDisplay {
  return new UnitConfigDisplay(buildWaterUnitConfig(showFlOz));
}

// ---------------------------------------------------------------------------
// Chart by Size
// ---------------------------------------------------------------------------

export type MixChartColumn = {
  label: string;
  isWater: boolean;
  unitConfigDisplay: UnitConfigDisplay;
  /** Rate per ksf in the column's app unit. */
  ratePerKsf: number;
};

export type MixChartRow = {
  size: number;
  amounts: MixChartAmount[];
};

/**
 * Builds the ordered column descriptors for the chart.
 * Water column comes first (if included), then product rows in order.
 */
export function buildMixChartColumns(params: {
  products: MixChartProductRow[];
  waterRatePerKsf: number | null;
  includeWater: boolean;
  showFlOz: boolean;
}): MixChartColumn[] {
  const { products, waterRatePerKsf, includeWater, showFlOz } = params;

  const columns: MixChartColumn[] = [];

  if (includeWater && waterRatePerKsf !== null) {
    columns.push({
      label: "Water",
      isWater: true,
      unitConfigDisplay: buildWaterUnitConfigDisplay(showFlOz),
      ratePerKsf: waterRatePerKsf,
    });
  }

  for (const row of products) {
    columns.push({
      label: row.label,
      isWater: false,
      unitConfigDisplay: row.unitConfigDisplay,
      ratePerKsf: row.rate,
    });
  }

  return columns;
}

/**
 * Generates mix chart data (chart by size).
 */
export function generateMixChartData(
  columns: MixChartColumn[],
  increment: number,
  maxSize: number,
): MixChartRow[] {
  const sizes: number[] = [];
  for (let size = increment; size <= maxSize; size += increment) {
    sizes.push(size);
  }

  return sizes.map((size) => ({
    size,
    amounts: columns.map((col) =>
      col.unitConfigDisplay.format({
        amount: col.ratePerKsf * size,
        targetContexts: ["load", "app"],
        minSigFigs: 2,
      }),
    ),
  }));
}

// ---------------------------------------------------------------------------
// Chart by Product Amount
// ---------------------------------------------------------------------------

export type MixChartByProductAmountRow = {
  amount: number;
  unit: string;
  sizeCovered: number;
  amounts: MixChartAmount[];
};

/**
 * Identifies the key column — either water or a product row by its id.
 */
export type MixChartKeyId = "water" | string; // string = MixChartProductRow.id

/**
 * Generates mix chart data keyed on a specific column (chart by product amount).
 */
export function generateMixChartByProductAmount(
  columns: MixChartColumn[],
  keyId: MixChartKeyId,
  increment: number,
  maxUnits: number,
  unitContext: UnitContext = "load",
): MixChartByProductAmountRow[] {
  // Find the key column
  const keyColumn = keyId === "water"
    ? columns.find((c) => c.isWater)
    : columns.find((c) => !c.isWater && c.label === keyId);

  if (!keyColumn || keyColumn.ratePerKsf === 0) return [];

  const conversion = keyColumn.unitConfigDisplay["unitConfig"].conversions[unitContext];
  const otherColumns = columns.filter((c) => c !== keyColumn);

  const units: number[] = [];
  for (let unit = increment; unit <= maxUnits; unit += increment) {
    units.push(unit);
  }

  return units.map((amount) => {
    const appAmount = amount * conversion.conversionFactor;
    const sizeCovered = appAmount / keyColumn.ratePerKsf;

    const amounts = otherColumns.map((col) =>
      col.unitConfigDisplay.format({
        amount: col.ratePerKsf * sizeCovered,
        targetContexts: ["load", "app"],
        minSigFigs: 2,
      }),
    );

    return {
      amount,
      unit: conversion.unitLabel,
      sizeCovered,
      amounts,
    };
  });
}
