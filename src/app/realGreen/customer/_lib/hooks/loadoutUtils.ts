import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  Loadout,
  LoadoutMaster,
  LoadoutSubProduct,
  LoadoutMixedProduct,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";

/**
 * Aggregates loadouts from multiple services into a single consolidated loadout.
 * Totals amounts at every level of the tree (masters → subs → mixed products).
 */
export function aggregateLoadouts(services: Service[]): Loadout {
  const loadouts = services.map((service) => service.loadout);

  // Flatten all masters from all loadouts
  const allMasters = loadouts.flatMap((loadout) => loadout.masters);

  // Group by master productId and aggregate
  const mastersMap = new Map<number, LoadoutMaster[]>();
  allMasters.forEach((master) => {
    const productId = master.product.productId;
    if (!mastersMap.has(productId)) {
      mastersMap.set(productId, []);
    }
    mastersMap.get(productId)!.push(master);
  });

  // Aggregate each group of masters
  const aggregatedMasters = Array.from(mastersMap.values()).map((masters) =>
    aggregateMasters(masters),
  );

  return { masters: aggregatedMasters };
}

/**
 * Aggregates multiple LoadoutMasters with the same productId.
 * Sums amounts and recursively aggregates sub-products.
 */
function aggregateMasters(masters: LoadoutMaster[]): LoadoutMaster {
  const first = masters[0];

  // Sum amounts across all masters
  const totalAmount = Math.round(
    masters.reduce((sum, master) => sum + master.plannedAmount, 0),
  );

  // Flatten all sub-products from all masters
  const allSubProducts = masters.flatMap((master) => master.subProducts);

  // Group by sub-product productId and aggregate
  const subProductsMap = new Map<number, LoadoutSubProduct[]>();
  allSubProducts.forEach((sub) => {
    const productId = sub.product.productId;
    if (!subProductsMap.has(productId)) {
      subProductsMap.set(productId, []);
    }
    subProductsMap.get(productId)!.push(sub);
  });

  // Aggregate each group of sub-products
  const aggregatedSubProducts = Array.from(subProductsMap.values()).map(
    (subs) => aggregateSubProducts(subs),
  );

  return {
    product: first.product,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    unit: first.unit,
    subProducts: aggregatedSubProducts,
  };
}

/**
 * Aggregates multiple LoadoutSubProducts with the same productId.
 * Sums amounts and recursively aggregates mixed products.
 */
function aggregateSubProducts(
  subProducts: LoadoutSubProduct[],
): LoadoutSubProduct {
  const first = subProducts[0];

  // Sum amounts across all sub-products
  const totalAmount = Math.round(
    subProducts.reduce((sum, sub) => sum + sub.plannedAmount, 0),
  );

  // Flatten all mixed products from all sub-products
  const allMixedProducts = subProducts.flatMap((sub) => sub.mixedProducts);

  // Group by mixed product productId
  const mixedProductsMap = new Map<number, LoadoutMixedProduct[]>();
  allMixedProducts.forEach((mixed) => {
    const productId = mixed.product.productId;
    if (!mixedProductsMap.has(productId)) {
      mixedProductsMap.set(productId, []);
    }
    mixedProductsMap.get(productId)!.push(mixed);
  });

  // Aggregate each group of mixed products
  const aggregatedMixedProducts = Array.from(mixedProductsMap.values()).map(
    (mixedProducts) => aggregateMixedProducts(mixedProducts),
  );

  return {
    config: first.config,
    product: first.product,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    unit: first.unit,
    mixedProducts: aggregatedMixedProducts,
  };
}

/**
 * Aggregates multiple LoadoutMixedProducts with the same productId.
 * Sums amounts (base case - no further nesting).
 */
function aggregateMixedProducts(
  mixedProducts: LoadoutMixedProduct[],
): LoadoutMixedProduct {
  const first = mixedProducts[0];

  // Sum amounts across all mixed products
  const totalAmount = Math.round(
    mixedProducts.reduce((sum, mixed) => sum + mixed.plannedAmount, 0),
  );

  return {
    product: first.product,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    unit: first.unit,
  };
}

