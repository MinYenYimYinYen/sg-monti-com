import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  LoadoutBase,
} from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

/**
 * Aggregates loadout inventories from multiple services into a single consolidated inventory.
 * Totals amounts at every level of the tree (masters → appMethods → subProducts).
 */
export function aggregateLoadoutInventory(services: Service[]): LoadoutBase {
  const loadoutInventories = services.map((service) => service.loadoutInventory);

  // Flatten all masters from all inventories
  const allMasters = loadoutInventories.flatMap((inventory) => inventory.masters);

  // Group by master productId and aggregate
  const mastersMap = new Map<number, LoadoutBase["masters"][number][]>();
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

  return { masters: aggregatedMasters, singles: [], subProducts: [] };
}

/**
 * Aggregates multiple masters with the same productId.
 * Sums amounts and recursively aggregates appMethods and sub-products.
 */
function aggregateMasters(
  masters: LoadoutBase["masters"][number][],
): LoadoutBase["masters"][number] {
  const first = masters[0];

  // Sum amounts across all masters
  const totalAmount = Math.round(
    masters.reduce((sum, master) => sum + master.plannedAmount, 0),
  );

  // Flatten and group appMethods by appMethodId
  const allAppMethods = masters.flatMap((master) => master.appMethods);
  const appMethodsMap = new Map<
    string,
    LoadoutBase["masters"][number]["appMethods"][number][]
  >();

  allAppMethods.forEach((appMethod) => {
    const appMethodId = appMethod.appMethod.appMethodId;
    if (!appMethodsMap.has(appMethodId)) {
      appMethodsMap.set(appMethodId, []);
    }
    appMethodsMap.get(appMethodId)!.push(appMethod);
  });

  // Aggregate each group of appMethods
  const aggregatedAppMethods = Array.from(appMethodsMap.values()).map(
    (appMethods) => aggregateAppMethods(appMethods),
  );

  // Flatten and group non-appMethod sub-products by productId
  const allSubProducts = masters.flatMap((master) => master.subProducts);
  const subProductsMap = new Map<
    number,
    LoadoutBase["masters"][number]["subProducts"][number][]
  >();

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
    productId: first.product.productId,
    product: first.product,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    unitId: first.unit.unitId,
    unit: first.unit,
    appMethods: aggregatedAppMethods,
    subProducts: aggregatedSubProducts,
  };
}

/**
 * Aggregates multiple appMethods with the same appMethodId.
 * Sums amounts for each sub-product within the appMethod.
 */
function aggregateAppMethods(
  appMethods: LoadoutBase["masters"][number]["appMethods"][number][],
): LoadoutBase["masters"][number]["appMethods"][number] {
  const first = appMethods[0];

  // Sum amounts across all appMethods
  const totalAmount = Math.round(
    appMethods.reduce((sum, am) => sum + am.plannedAmount, 0),
  );

  // Flatten all sub-products from all appMethods
  const allSubProducts = appMethods.flatMap((am) => am.subProducts);

  // Group by sub-product productId
  const subProductsMap = new Map<
    number,
    LoadoutBase["masters"][number]["appMethods"][number]["subProducts"][number][]
  >();

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
    appMethodId: first.appMethod.appMethodId,
    appMethod: first.appMethod,
    mixProductId: first.mixProduct.productId,
    mixProduct: first.mixProduct,
    mixProductUnitId: first.mixProductUnit.unitId,
    mixProductUnit: first.mixProductUnit,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    subProducts: aggregatedSubProducts,
  };
}

/**
 * Aggregates multiple sub-products with the same productId.
 * Sums amounts (base case - no further nesting).
 */
function aggregateSubProducts(
  subProducts: LoadoutBase["masters"][number]["subProducts"][number][],
): LoadoutBase["masters"][number]["subProducts"][number] {
  const first = subProducts[0];

  // Sum amounts across all sub-products
  const totalAmount = Math.round(
    subProducts.reduce((sum, sub) => sum + sub.plannedAmount, 0),
  );

  return {
    productId: first.product.productId,
    product: first.product,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    unitId: first.unit.unitId,
    unit: first.unit,
  };
}
