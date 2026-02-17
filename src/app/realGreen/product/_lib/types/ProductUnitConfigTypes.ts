import { Metric } from "./UnitTypes";

/**
 * Unit Context Types
 * Defines the different contexts in which products are measured/handled
 */
export type UnitContext = "app" | "load" | "purchase";

export const UNIT_CONTEXTS: Record<UnitContext, string> = {
  app: "Application",
  load: "Loading",
  purchase: "Purchasing",
};

/**
 * Unit Conversion Configuration
 * Defines how a product is measured in a specific context
 * Only one conversion allowed per context
 */
export type UnitConversion = {
  context: UnitContext;
  unitLabel: string; // Display name: e.g., "50lb Bag", "Pallet (40 bags)", "Lbs"
  conversionFactor: number; // Multiplier from base AppUnit (1 for app context)
  baseMetric: Metric; // Links to the underlying metric type
};

/**
 * Product Unit Configuration
 * Stores all unit conversion configurations for a specific product
 */
export type ProductUnitConfig = {
  productId: number;
  conversions: UnitConversion[];
  createdAt?: Date;
  updatedAt?: Date;
};

/**
 * Storage type for MongoDB
 */
export type ProductUnitConfigStorage = {
  productId: number;
  conversions: UnitConversion[];
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Helper function to get conversion for a specific context
 * Only one conversion per context, so just find by context
 */
export function getConversionForContext(
  config: ProductUnitConfig | null | undefined,
  context: UnitContext,
): UnitConversion | null {
  if (!config) return null;
  return config.conversions.find((c) => c.context === context) || null;
}

/**
 * Helper function to convert quantity between contexts
 */
export function convertQuantity(
  quantity: number,
  fromContext: UnitContext,
  toContext: UnitContext,
  config: ProductUnitConfig | null | undefined,
): number {
  if (!config || fromContext === toContext) return quantity;

  const fromConversion = getConversionForContext(config, fromContext);
  const toConversion = getConversionForContext(config, toContext);

  if (!fromConversion || !toConversion) return quantity;

  // Convert to base unit (app context), then to target context
  const baseQuantity = quantity * fromConversion.conversionFactor;
  return baseQuantity / toConversion.conversionFactor;
}

/**
 * Helper to create a default app context conversion
 */
export function createDefaultAppConversion(
  unitLabel: string,
  metric: Metric,
): UnitConversion {
  return {
    context: "app",
    unitLabel,
    conversionFactor: 1,
    baseMetric: metric,
  };
}

/**
 * Example configurations for common scenarios
 */
export const EXAMPLE_CONFIGS = {
  fertilizer50lbBags: {
    productId: 0, // placeholder
    conversions: [
      {
        context: "app" as UnitContext,
        unitLabel: "Lbs",
        conversionFactor: 1,
        baseMetric: "weight" as Metric,
      },
      {
        context: "load" as UnitContext,
        unitLabel: "50lb Bag",
        conversionFactor: 50,
        baseMetric: "weight" as Metric,
      },
      {
        context: "purchase" as UnitContext,
        unitLabel: "Pallet (40 bags)",
        conversionFactor: 2000, // 50 * 40
        baseMetric: "weight" as Metric,
      },
    ],
  },
  liquidConcentrate: {
    productId: 0, // placeholder
    conversions: [
      {
        context: "app" as UnitContext,
        unitLabel: "Fl Oz",
        conversionFactor: 1,
        baseMetric: "volume" as Metric,
      },
      {
        context: "load" as UnitContext,
        unitLabel: "1 Gal Jug",
        conversionFactor: 128, // 128 fl oz per gallon
        baseMetric: "volume" as Metric,
      },
      {
        context: "purchase" as UnitContext,
        unitLabel: "Case (4 jugs)",
        conversionFactor: 512, // 128 * 4
        baseMetric: "volume" as Metric,
      },
    ],
  },
};
