import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { baseProductSub } from "@/app/realGreen/product/_lib/baseProduct";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";

/**
 * WATER_PRODUCT_ID
 *
 * Sentinel product ID for the water carrier sub-product.
 * Negative to avoid collision with real RealGreen product IDs.
 * Used by hydrateLoadoutInventory and loadout selectors to identify
 * the auto-generated water row when an AppMethod has needsWater = true.
 */
export const WATER_PRODUCT_ID = -2;

/**
 * waterProduct
 *
 * Client-side constant representing the water carrier sub-product.
 * Not stored in MongoDB — synthesized at runtime when an AppMethod
 * with needsWater = true is associated with a master product.
 *
 * Unit: Mixed Gallons (Gal) — matches the volumeUnit used in AppMethod.coverage.
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
};
