import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { baseProductSub } from "@/app/realGreen/product/_lib/baseProduct";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductUnitConfig } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

/**
 * WATER_PRODUCT_ID
 *
 * Sentinel product ID for the water carrier sub-product.
 * Negative to avoid collision with real RealGreen product IDs.
 * Used by hydratePlannedLoadout and loadout selectors to identify
 * the auto-generated water row when an AppMethod has needsWater = true.
 */
export const WATER_PRODUCT_ID = -2;

/**
 * buildWaterUnitConfig
 *
 * Factory that produces the correct unit config for a water carrier based on
 * the equipment's `showFlOz` flag.
 *
 * Convention: `app` is the most specific unit.
 *
 * showFlOz: false (large tank — e.g. 300 Gal)
 *   app  = Gal / factor 1   (Gal is already the most specific needed)
 *   load = Gal / factor 1
 *
 * showFlOz: true (small tank — e.g. 3 Gal)
 *   app  = Fl Oz / factor 1   (most specific)
 *   load = Gal   / factor 128 (1 Gal = 128 Fl Oz)
 *
 * Display in AppMethodSection:
 *   showFlOz: false → targetContexts: ["load"]        → "9 Gal"
 *   showFlOz: true  → targetContexts: ["load", "app"] → "0 Gal 115 Fl Oz"
 */
export function buildWaterUnitConfig(showFlOz: boolean): ProductUnitConfig {
  if (showFlOz) {
    return {
      productId: WATER_PRODUCT_ID,
      conversions: {
        app: {
          context: "app",
          unitLabel: UnitLabel.flOz,
          conversionFactor: 1,
          baseMetric: "volume",
        },
        load: {
          context: "load",
          unitLabel: UnitLabel.mGal,
          conversionFactor: 128,
          baseMetric: "volume",
        },
        purchase: {
          context: "purchase",
          unitLabel: UnitLabel.mGal,
          conversionFactor: 128,
          baseMetric: "volume",
        },
      },
    };
  }

  return {
    productId: WATER_PRODUCT_ID,
    conversions: {
      app: {
        context: "app",
        unitLabel: UnitLabel.mGal,
        conversionFactor: 1,
        baseMetric: "volume",
      },
      load: {
        context: "load",
        unitLabel: UnitLabel.mGal,
        conversionFactor: 1,
        baseMetric: "volume",
      },
      purchase: {
        context: "purchase",
        unitLabel: UnitLabel.mGal,
        conversionFactor: 1,
        baseMetric: "volume",
      },
    },
  };
}

const defaultWaterUnitConfig = buildWaterUnitConfig(false);

/**
 * waterProduct
 *
 * Client-side constant representing the water carrier sub-product.
 * Not stored in MongoDB — synthesized at runtime when an AppMethod
 * with needsWater = true is associated with a master product.
 *
 * Uses showFlOz: false (Gal-only) as the default. hydratePlannedLoadout
 * overrides unitConfig/unitConfigDisplay per equipment entry using
 * buildWaterUnitConfig(entry.showFlOz).
 */
export const waterProduct: ProductSub = {
  ...baseProductSub,
  productId: WATER_PRODUCT_ID,
  description: "Water",
  productCode: "WATER",
  unit: {
    unitId: -2,
    metric: "volume",
    desc: UnitLabel.mGal,
  },
  unitConfig: defaultWaterUnitConfig,
  unitConfigDisplay: new UnitConfigDisplay(defaultWaterUnitConfig),
};
