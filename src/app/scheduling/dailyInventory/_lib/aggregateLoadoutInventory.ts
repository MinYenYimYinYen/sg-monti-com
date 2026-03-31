import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

/**
 * Aggregates loadout inventories from multiple services into a single consolidated inventory.
 * Totals amounts at every level of the tree (masters → equipments → subProducts).
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
 * Sums amounts and recursively aggregates equipments and sub-products.
 */
function aggregateMasters(
  masters: LoadoutBase["masters"][number][],
): LoadoutBase["masters"][number] {
  const first = masters[0];

  // Sum amounts across all masters
  const totalAmount = Math.round(
    masters.reduce((sum, master) => sum + master.plannedAmount, 0),
  );

  // Flatten and group equipments by equipmentId
  const allEquipments = masters.flatMap((master) => master.equipments);
  const equipmentsMap = new Map<
    string,
    LoadoutBase["masters"][number]["equipments"][number][]
  >();

  allEquipments.forEach((equipment) => {
    const equipmentId = equipment.equipmentId;
    if (!equipmentsMap.has(equipmentId)) {
      equipmentsMap.set(equipmentId, []);
    }
    equipmentsMap.get(equipmentId)!.push(equipment);
  });

  // Aggregate each group of equipments
  const aggregatedEquipments = Array.from(equipmentsMap.values()).map(
    (equipments) => aggregateEquipments(equipments),
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
    equipments: aggregatedEquipments,
    subProducts: aggregatedSubProducts,
  };
}

/**
 * Aggregates multiple equipments with the same equipmentId.
 * Sums amounts for each sub-product within the equipment.
 */
function aggregateEquipments(
  equipments: LoadoutBase["masters"][number]["equipments"][number][],
): LoadoutBase["masters"][number]["equipments"][number] {
  const first = equipments[0];

  // Sum amounts across all equipments
  const totalAmount = Math.round(
    equipments.reduce((sum, equipment) => sum + equipment.plannedAmount, 0),
  );

  // Flatten all sub-products from all equipments
  const allSubProducts = equipments.flatMap((equipment) => equipment.subProducts);

  // Group by sub-product productId
  const subProductsMap = new Map<
    number,
    LoadoutBase["masters"][number]["equipments"][number]["subProducts"][number][]
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
    (subs) => aggregateEquipmentSubProducts(subs),
  );

  return {
    equipmentId: first.equipmentId,
    appMethod: first.appMethod,
    carrierProductId: first.carrierProduct.productId,
    carrierProduct: first.carrierProduct,
    carrierProductUnitId: first.carrierProductUnit.unitId,
    carrierProductUnit: first.carrierProductUnit,
    plannedAmount: totalAmount,
    startAmount: null,
    finishAmount: null,
    subProducts: aggregatedSubProducts,
  };
}

/**
 * Aggregates multiple sub-products with the same productId.
 * Sums amounts (base case - no further nesting).
 * ratePerKsf is a constant per product — take from first entry (not summed).
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

/**
 * Aggregates multiple equipment sub-products with the same productId.
 * Sums plannedAmount; ratePerKsf is a constant per product — take from first entry.
 */
function aggregateEquipmentSubProducts(
  subProducts: LoadoutBase["masters"][number]["equipments"][number]["subProducts"][number][],
): LoadoutBase["masters"][number]["equipments"][number]["subProducts"][number] {
  const first = subProducts[0];

  const totalAmount = Math.round(
    subProducts.reduce((sum, sub) => sum + sub.plannedAmount, 0),
  );

  return {
    productId: first.product.productId,
    product: first.product,
    plannedAmount: totalAmount,
    ratePerKsf: first.ratePerKsf,
    startAmount: null,
    finishAmount: null,
    unitId: first.unit.unitId,
    unit: first.unit,
  };
}
