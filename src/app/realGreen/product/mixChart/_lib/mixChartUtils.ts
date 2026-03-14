import { ProductMaster, SubProductConfig } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { CompoundUnitDisplay } from "@/app/realGreen/product/_lib/utils/UnitConfigDisplay";
import { UnitContext } from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";

export type MixChartAmount = CompoundUnitDisplay;

export type MixChartRow = {
  size: number;
  amounts: MixChartAmount[];
};

/**
 * Single source of truth for product amount calculations.
 * Given a size and sub-product config, calculates the application amount.
 */
export function calculateAmountNeeded({size, rate}: {size: number, rate: number}

): number {
  return size * rate;
}

/**
 * Inverse calculation: given amount and rate, calculate size covered.
 */
export function calculateSizeCovered({appAmount, rate}: {appAmount: number, rate: number}

): number {
  return appAmount / rate;
}

export function generateMixChartData(
  master: ProductMaster,
  increment: number,
  maxSize: number,
): MixChartRow[] {
  const sizes: number[] = [];
  for (let size = increment; size <= maxSize; size += increment) {
    sizes.push(size);
  }

  return sizes.map((size) => ({
    size,
    amounts: master.subProductConfigs.map((config) => {
      const appAmount = calculateAmountNeeded({
        size,
        rate: config.rate,
      });
      // Use unitConfigDisplay to format compound units
      return config.subProduct.unitConfigDisplay.format({
        amount: appAmount,
        targetContexts: ["load", "app"],
      });
    }),
  }));
}

export type MixChartByProductAmountRow = {
  amount: number;
  unit: string;
  sizeCovered: number;
  amounts: MixChartAmount[];
};

export function generateMixChartByProductAmount(
  master: ProductMaster,
  selectedSubId: number,
  increment: number,
  maxUnits: number,
  unitContext: UnitContext = "load",
): MixChartByProductAmountRow[] {
  const selectedConfig = master.subProductConfigs.find(
    (config) => config.subId === selectedSubId
  );

  if (!selectedConfig) return [];

  const conversion = selectedConfig.subProduct.unitConfig.conversions[unitContext];
  const units: number[] = [];

  for (let unit = increment; unit <= maxUnits; unit += increment) {
    units.push(unit);
  }

  return units.map((amount) => {
    // Convert selected unit context to app units
    const appAmount = amount * conversion.conversionFactor;

    // Calculate size covered based on the selected product's rate
    const sizeCovered = calculateSizeCovered({
      appAmount,
      rate: selectedConfig.rate,
    });

    // Calculate amounts needed for OTHER sub-products
    const amounts = master.subProductConfigs
      .filter((config) => config.subId !== selectedSubId)
      .map((config) => {
        const requiredAppAmount = calculateAmountNeeded({
          size: sizeCovered,
          rate: config.rate,
        });
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
    };
  });
}
