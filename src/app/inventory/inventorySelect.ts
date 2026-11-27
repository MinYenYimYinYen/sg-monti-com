import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { VolumeUnit, WeightUnit, LengthUnit, TimeUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  InventoryCheck,
  InventoryCheckEntryHydrated,
  LastProductCount,
  ProductCount,
} from "@/app/inventory/InventoryTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

// ---------------------------------------------------------------------------
// Raw state selectors
// ---------------------------------------------------------------------------

const selectChecks = (state: AppState) => state.inventory.checks;
const selectSession = (state: AppState) => state.inventory.session;
const selectPrevSessionChecked = (state: AppState) => state.inventory.prevSessionChecked;
const selectTodayCheckLoaded = (state: AppState) => state.inventory.todayCheckLoaded;

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

const selectHydratedChecks = createSelector(
  [selectChecks, productSelect.allProductsMap],
  (checks, allProductsMap): InventoryCheck[] =>
    checks.map((check) => ({
      ...check,
      entries: check.entries.flatMap((entry): InventoryCheckEntryHydrated[] => {
        const product = allProductsMap.get(entry.productId);
        if (!product) return [];
        return [{ ...entry, product }];
      }),
    })),
);

const selectActiveProducts = createSelector(
  [selectSession, productSelect.allProductsMap],
  (session, allProductsMap): ProductCommon[] =>
    session.activeProductIds.flatMap((id) => {
      const product = allProductsMap.get(id);
      return product ? [product] : [];
    }),
);

/**
 * Factory selector — returns a selector for the ProductCount[] of a specific product.
 * Create once per productId (e.g., at the component level) to avoid re-creating on every render.
 */
const makeSelectCountsForProduct = (productId: number) =>
  createSelector(
    [selectSession],
    (session): ProductCount[] => session.counts[productId] ?? [],
  );

/**
 * Builds a map of the most recent saved count for each product across all checks.
 * checks are sorted newest-first, so the first occurrence of each productId wins.
 */
const selectLastCountMap = createSelector(
  [selectChecks],
  (checks): Map<number, LastProductCount> => {
    const map = new Map<number, LastProductCount>();
    for (const check of checks) {
      for (const entry of check.entries) {
        if (!map.has(entry.productId)) {
          map.set(entry.productId, {
            totalCount: entry.totalCount,
            unit: entry.unit,
            date: check.checkDate,
          });
        }
      }
    }
    return map;
  },
);

/**
 * Factory selector — returns a selector for the LastProductCount of a specific product.
 * Create once per productId (e.g., at the component level) to avoid re-creating on every render.
 */
const makeSelectLastCountForProduct = (productId: number) =>
  createSelector(
    [selectLastCountMap],
    (lastCountMap): LastProductCount | null => lastCountMap.get(productId) ?? null,
  );

/**
 * Products that have a last recorded count > 0 across all checks.
 * Sorted alphabetically by description.
 */
const selectProductsWithNonZeroLastCount = createSelector(
  [selectLastCountMap, productSelect.allProductsMap],
  (lastCountMap, allProductsMap): ProductCommon[] => {
    const products: ProductCommon[] = [];
    for (const [productId, lastCount] of lastCountMap) {
      if (lastCount.totalCount > 0) {
        const product = allProductsMap.get(productId);
        if (product) products.push(product);
      }
    }
    return products.sort((a, b) => a.description.localeCompare(b.description));
  },
);

/**
 * Products that have a last recorded count === 0 across all checks.
 * Sorted alphabetically by description.
 */
const selectProductsWithZeroLastCount = createSelector(
  [selectLastCountMap, productSelect.allProductsMap],
  (lastCountMap, allProductsMap): ProductCommon[] => {
    const products: ProductCommon[] = [];
    for (const [productId, lastCount] of lastCountMap) {
      if (lastCount.totalCount === 0) {
        const product = allProductsMap.get(productId);
        if (product) products.push(product);
      }
    }
    return products.sort((a, b) => a.description.localeCompare(b.description));
  },
);

export const inventorySelect = {
  checks: selectChecks,
  hydratedChecks: selectHydratedChecks,
  session: selectSession,
  prevSessionChecked: selectPrevSessionChecked,
  todayCheckLoaded: selectTodayCheckLoaded,
  activeProducts: selectActiveProducts,
  makeCountsForProduct: makeSelectCountsForProduct,
  makeLastCountForProduct: makeSelectLastCountForProduct,
  productsWithNonZeroLastCount: selectProductsWithNonZeroLastCount,
  productsWithZeroLastCount: selectProductsWithZeroLastCount,
};

// ---------------------------------------------------------------------------
// Unit conversion helpers (pure functions — not selectors)
// ---------------------------------------------------------------------------

/**
 * Converts a single ProductCount to app units.
 *
 * Formula: qty × (unitQty ?? 1), then convert from count.unit to the product's actual app unit.
 * The app unit is product.unitConfig.conversions.app.unitLabel — it is the base unit that
 * UnitConfigDisplay.format() expects. We must convert to this specific label, not a hardcoded
 * metric sentinel (e.g. mGal), because the product's app unit may differ (e.g. Fl Oz vs Gal).
 */
export function countToAppUnits(count: ProductCount, product: ProductCommon): number {
  const rawQty = count.qty * (count.unitQty ?? 1);
  const appUnit = product.unitConfig.conversions.app.unitLabel;
  const metric = product.unit.metric;

  switch (metric) {
    case "volume":
      return UnitUtils.volume(rawQty, count.unit as VolumeUnit["desc"]).to(
        appUnit as VolumeUnit["desc"],
      );
    case "weight":
      return UnitUtils.weight(rawQty, count.unit as WeightUnit["desc"]).to(
        appUnit as WeightUnit["desc"],
      );
    case "length":
      return UnitUtils.distance(rawQty, count.unit as LengthUnit["desc"]).to(
        appUnit as LengthUnit["desc"],
      );
    case "time":
      return UnitUtils.time(rawQty, count.unit as TimeUnit["desc"]).to(
        appUnit as TimeUnit["desc"],
      );
    // area, count, unknown — no conversion, return raw
    default:
      return rawQty;
  }
}

/**
 * Sums all ProductCounts for a product to a single app-unit total.
 */
export function sumCountsToAppUnits(counts: ProductCount[], product: ProductCommon): number {
  return counts.reduce((sum, count) => sum + countToAppUnits(count, product), 0);
}
