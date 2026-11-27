import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductUnitConfig } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";

/**
 * Sentinel product id for the water column. Negative so it can never collide with a real
 * RealGreen product id.
 */
export const WATER_PRODUCT_ID = -2;

/**
 * Builds the unit config for the chart's water column from the chart's gallons / fl oz choice.
 *
 * Convention: `app` is the most specific unit.
 *
 * showFlOz false (large tank, e.g. 300 Gal)
 *   app  = Gal / factor 1
 *   load = Gal / factor 1
 *
 * showFlOz true (small tank, e.g. 3 Gal)
 *   app  = Fl Oz / factor 1   (most specific)
 *   load = Gal   / factor 128 (1 Gal = 128 Fl Oz)
 *
 * Display with targetContexts ["load", "app"]:
 *   showFlOz false -> "9 Gal"
 *   showFlOz true  -> "0 Gal 115 Fl Oz"
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
