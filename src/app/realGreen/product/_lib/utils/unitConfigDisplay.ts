import {
  ProductUnitConfig,
  UnitContext,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";

/**
 * Represents a single part of a compound unit display
 * Example: "3 Bags" would be { amount: 3, unit: "Bags", isWhole: true }
 */
export type CompoundUnitPart = {
  amount: number;
  unit: string;
  isWhole: boolean; // True for whole numbers (major units), false for remainders
};

/**
 * Complete compound unit display with both structured parts and formatted string
 * Example: { parts: [...], formattedString: "3 Bags 12 Lbs" }
 */
export type CompoundUnitDisplay = {
  parts: CompoundUnitPart[];
  formattedString: string;
};

/**
 * Parameters for formatting a compound unit display
 */
export type FormatCompoundUnitParams = {
  amount: number; // Quantity in app/base units
  targetContexts: UnitContext[]; // Waterfall array, e.g., ["load", "app"]
};

/**
 * Threshold below which remainders are not displayed (0.01 base units)
 */
const REMAINDER_THRESHOLD = 0.01;

/**
 * UnitConfigDisplay class provides display formatting methods for product unit conversions.
 *
 * This class is instantiated with a ProductUnitConfig and provides methods to format
 * quantities in various compound unit formats (e.g., "3 Bags 12 Lbs").
 *
 * Instances are created in selectors and attached to ProductCommon objects for easy access.
 *
 * @example
 * const display = new UnitConfigDisplay(product.unitConfig);
 * const result = display.format({ amount: 162, targetContexts: ["load", "app"] });
 * // result.formattedString = "3 Bags 12 Lbs"
 */
export class UnitConfigDisplay {
  constructor(private readonly unitConfig: ProductUnitConfig) {}

  /**
   * Format a quantity in compound units using a waterfall of target contexts.
   *
   * The function processes contexts in order, showing whole units for each context,
   * with remainders cascading down to subsequent contexts.
   *
   * @example
   * // Single-level: "3 Bags 12 Lbs"
   * format({ amount: 162, targetContexts: ["load", "app"] })
   *
   * @example
   * // Multi-level: "2 Pallets 5 Bags 25 Lbs"
   * format({ amount: 5450, targetContexts: ["purchase", "load", "app"] })
   *
   * @example
   * // Amount less than 1 major unit: "58 Fl Oz"
   * format({ amount: 58, targetContexts: ["load", "app"] })
   */
  format({ amount, targetContexts }: FormatCompoundUnitParams): CompoundUnitDisplay {
    const appConversion = this.unitConfig.conversions.app;

    // Simple case: no contexts or only app context
    if (
      targetContexts.length === 0 ||
      (targetContexts.length === 1 && targetContexts[0] === "app")
    ) {
      const part: CompoundUnitPart = {
        amount: Math.round(amount * 100) / 100,
        unit: appConversion.unitLabel,
        isWhole: false,
      };
      return {
        parts: [part],
        formattedString: `${part.amount} ${part.unit}`,
      };
    }

    // Validate all contexts have same base metric
    const baseMetric = appConversion.baseMetric;
    const validContexts = targetContexts.filter((ctx) => {
      const conversion = this.unitConfig.conversions[ctx];
      return conversion && conversion.baseMetric === baseMetric;
    });

    if (validContexts.length === 0) {
      // Fallback to app units if no valid contexts
      const part: CompoundUnitPart = {
        amount: Math.round(amount * 100) / 100,
        unit: appConversion.unitLabel,
        isWhole: false,
      };
      return {
        parts: [part],
        formattedString: `${part.amount} ${part.unit}`,
      };
    }

    // Process waterfall: calculate whole units for each context
    const parts: CompoundUnitPart[] = [];
    let remainingAmount = amount;

    for (const context of validContexts) {
      const conversion = this.unitConfig.conversions[context];

      // Skip app context in middle of waterfall (it's always the final remainder)
      if (context === "app") continue;

      const amountInContext = remainingAmount / conversion.conversionFactor;

      // If less than 1 unit, skip this context
      if (amountInContext < 1) continue;

      const wholeUnits = Math.floor(amountInContext);
      parts.push({
        amount: wholeUnits,
        unit: conversion.unitLabel,
        isWhole: true,
      });

      // Calculate remainder in base units
      remainingAmount = remainingAmount - wholeUnits * conversion.conversionFactor;
    }

    // Add final remainder in app units if significant
    if (remainingAmount >= REMAINDER_THRESHOLD) {
      parts.push({
        amount: Math.round(remainingAmount * 100) / 100,
        unit: appConversion.unitLabel,
        isWhole: false,
      });
    }

    // If no parts were added (amount too small), show in app units
    if (parts.length === 0) {
      const part: CompoundUnitPart = {
        amount: Math.round(amount * 100) / 100,
        unit: appConversion.unitLabel,
        isWhole: false,
      };
      return {
        parts: [part],
        formattedString: `${part.amount} ${part.unit}`,
      };
    }

    // Format string
    const formattedString = parts.map((p) => `${p.amount} ${p.unit}`).join(" ");

    return {
      parts,
      formattedString,
    };
  }

  /**
   * Get the conversion factor between two contexts.
   * Returns the multiplier to convert from 'from' context to 'to' context.
   *
   * @example
   * getConversionFactor("app", "load") // Returns 0.02 for 50lb bags (1 lb = 0.02 bags)
   * getConversionFactor("load", "app") // Returns 50 for 50lb bags (1 bag = 50 lbs)
   */
  getConversionFactor(from: UnitContext, to: UnitContext): number {
    const fromConv = this.unitConfig.conversions[from];
    const toConv = this.unitConfig.conversions[to];
    return fromConv.conversionFactor / toConv.conversionFactor;
  }

  /**
   * Check if the given contexts can be compounded together.
   * Returns true only if all contexts share the same base metric.
   *
   * @example
   * canCompound(["load", "app"]) // true if both are "weight" or both are "volume"
   * canCompound(["load", "purchase"]) // false if different metrics
   */
  canCompound(contexts: UnitContext[]): boolean {
    const baseMetric = this.unitConfig.conversions.app.baseMetric;
    return contexts.every(
      (ctx) => this.unitConfig.conversions[ctx]?.baseMetric === baseMetric,
    );
  }

  /**
   * Get the unit label for a specific context.
   *
   * @example
   * getUnitLabel("load") // "Bags"
   * getUnitLabel("app") // "Lbs"
   */
  getUnitLabel(context: UnitContext): string {
    return this.unitConfig.conversions[context]?.unitLabel ?? "";
  }

  /**
   * Get the base metric for this unit configuration.
   *
   * @example
   * getBaseMetric() // "weight" or "volume" etc.
   */
  getBaseMetric(): string {
    return this.unitConfig.conversions.app.baseMetric;
  }
}
