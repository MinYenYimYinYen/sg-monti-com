import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

/**
 * Aggregates loadout inventories from multiple services into a single consolidated inventory.
 * Totals amounts at every level of the tree (masters → equipmentEntries → subProducts).
 */
export function aggregateLoadoutInventory(inventories: LoadoutBase[]): LoadoutBase {
  // Flatten all masters from all inventories
  const allMasters = inventories.flatMap((inventory) => inventory.masters);

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
 * Sums amounts and recursively aggregates equipmentEntries and sub-products.
 */
function aggregateMasters(
  masters: LoadoutBase["masters"][number][],
): LoadoutBase["masters"][number] {
  const first = masters[0];

  // Sum amounts across all masters
  const totalAmount = Math.round(
    masters.reduce((sum, master) => sum + master.plannedAmount, 0),
  );

  // Flatten and group equipmentEntries by equipmentId
  const allEquipmentEntries = masters.flatMap((master) => master.equipmentEntries);
  const equipmentEntriesMap = new Map<
    string,
    LoadoutBase["masters"][number]["equipmentEntries"][number][]
  >();

  allEquipmentEntries.forEach((entry) => {
    const equipmentId = entry.equipmentId;
    if (!equipmentEntriesMap.has(equipmentId)) {
      equipmentEntriesMap.set(equipmentId, []);
    }
    equipmentEntriesMap.get(equipmentId)!.push(entry);
  });

  // Aggregate each group of equipment entries
  const aggregatedEquipmentEntries = Array.from(equipmentEntriesMap.values()).map(
    (entries) => aggregateEquipmentEntries(entries),
  );

  // Flatten and group non-equipment sub-products by productId
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
    equipmentEntries: aggregatedEquipmentEntries,
    subProducts: aggregatedSubProducts,
  };
}

/**
 * Aggregates multiple equipment entries with the same equipmentId.
 * Sums amounts for each sub-product within the entry.
 */
function aggregateEquipmentEntries(
  entries: LoadoutBase["masters"][number]["equipmentEntries"][number][],
): LoadoutBase["masters"][number]["equipmentEntries"][number] {
  const first = entries[0];

  // Sum amounts across all entries
  const totalAmount = Math.round(
    entries.reduce((sum, e) => sum + e.plannedAmount, 0),
  );

  // Flatten all sub-products from all entries
  const allSubProducts = entries.flatMap((e) => e.subProducts);

  // Group by sub-product productId
  const subProductsMap = new Map<
    number,
    LoadoutBase["masters"][number]["equipmentEntries"][number]["subProducts"][number][]
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
    equipmentId: first.equipmentId,
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
