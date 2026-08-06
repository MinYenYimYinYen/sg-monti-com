import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { VolumeUnit, WeightUnit, LengthUnit, TimeUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  InventoryCheck,
  InventoryCheckEntryHydrated,
  InventoryPrediction,
  LastProductCount,
  ProductCount,
} from "@/app/inventory/InventoryTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

// ---------------------------------------------------------------------------
// Raw state selectors
// ---------------------------------------------------------------------------

const selectChecks = (state: AppState) => state.inventory.checks;
const selectSession = (state: AppState) => state.inventory.session;
const selectSessionDateRange = (state: AppState) => state.inventory.session.dateRange;
const selectPrevSessionChecked = (state: AppState) => state.inventory.prevSessionChecked;
const selectTodayCheckLoaded = (state: AppState) => state.inventory.todayCheckLoaded;

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

const selectLastCheck = createSelector(
  [selectChecks],
  (checks) => checks[0] ?? null,
);

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
 * Extracts unique non-master productIds from services within the session dateRange.
 * Used by the page to auto-populate activeProductIds — independent of activeProductIds
 * to avoid the chicken-and-egg problem where predictions require active products.
 *
 * Sources: production.usedAppProducts (filtered to non-masters) +
 *          loadoutInventory sub-products and constituents (already non-master by definition).
 */
const selectProductIdsFromServices = createSelector(
  [selectSession, centralSelect.services, productSelect.allProductsMap],
  (session, services, allProductsMap): number[] => {
    const { dateRange } = session;
    if (!dateRange) return [];

    const inRange = services.filter((service) => {
      const doneDate = service.production?.doneDate;
      return doneDate && doneDate >= dateRange.min && doneDate <= dateRange.max;
    });

    const ids = new Set<number>();
    for (const service of inRange) {
      // production.usedAppProducts may include master products — filter them out
      for (const ap of service.production?.usedAppProducts ?? []) {
        const product = allProductsMap.get(ap.productId);
        if (product && !product.isMaster) ids.add(ap.productId);
      }
      // loadoutInventory sub-products and constituents are never masters
      for (const master of service.loadoutInventory.masters) {
        for (const sub of master.subProducts) ids.add(sub.productId);
        for (const equipment of master.equipments) {
          for (const constituent of equipment.constituents) {
            if (constituent.ratePerKsf > 0) ids.add(constituent.product.productId);
          }
        }
      }
    }

    return Array.from(ids);
  },
);

/**
 * Computes InventoryPrediction[] for all active products.
 *
 * - Filters centralSelect.services to those with a doneDate within session.dateRange.
 * - Recorded: sums AppProductCore.amount from production.usedAppProducts.
 * - Planned: walks the LoadoutBase tree (masters → subProducts, equipments → constituents).
 *   Skips the water carrier constituent (ratePerKsf === 0).
 * - Returns [] when dateRange is null or no active products.
 */
const selectPredictions = createSelector(
  [selectSession, selectLastCheck, centralSelect.services, productSelect.allProductsMap],
  (session, lastCheck, services, allProductsMap): InventoryPrediction[] => {
    const { dateRange, activeProductIds } = session;
    if (!dateRange || activeProductIds.length === 0) return [];

    const inRange = services.filter((service) => {
      const doneDate = service.production?.doneDate;
      return doneDate && doneDate >= dateRange.min && doneDate <= dateRange.max;
    });

    return activeProductIds.flatMap((productId) => {
      const product = allProductsMap.get(productId);
      if (!product) return [];

      let recordedUsed = 0;
      let plannedUsed = 0;

      for (const service of inRange) {
        // Recorded — from CRM production data
        const usedProducts = service.production?.usedAppProducts ?? [];
        for (const ap of usedProducts) {
          if (ap.productId === productId) recordedUsed += ap.amount;
        }

        // Planned — from loadoutInventory tree.
        // Masters are conceptual containers (job area), not physical products — skip master.productId.
        // Top-level singles and subProducts are ad-hoc tech additions with no plannedAmount — skip.
        const loadout = service.loadoutInventory;
        for (const master of loadout.masters) {
          for (const sub of master.subProducts) {
            if (sub.productId === productId) plannedUsed += sub.plannedAmount;
          }
          for (const equipment of master.equipments) {
            for (const constituent of equipment.constituents) {
              // Skip water carrier (ratePerKsf === 0)
              if (
                constituent.product.productId === productId &&
                constituent.ratePerKsf > 0
              ) {
                plannedUsed += constituent.plannedAmount;
              }
            }
          }
        }
      }

      const lastEntry = lastCheck?.entries.find((e) => e.productId === productId);
      const onHandPrev = lastEntry?.totalCount ?? 0;
      const onHandPredicted = onHandPrev - recordedUsed;

      return [{ productId, product, plannedUsed, recordedUsed, onHandPrev, onHandPredicted }];
    });
  },
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
  lastCheck: selectLastCheck,
  hydratedChecks: selectHydratedChecks,
  session: selectSession,
  sessionDateRange: selectSessionDateRange,
  prevSessionChecked: selectPrevSessionChecked,
  todayCheckLoaded: selectTodayCheckLoaded,
  activeProducts: selectActiveProducts,
  predictions: selectPredictions,
  productIdsFromServices: selectProductIdsFromServices,
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
