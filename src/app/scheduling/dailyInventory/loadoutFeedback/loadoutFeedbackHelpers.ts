import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutFinal } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { WATER_PRODUCT_ID } from "@/app/equipment/waterProduct";
import { EquipmentMixFeedback, MasterProductFeedbackEntry, ProductFeedbackEntry } from "./LoadoutFeedback";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

// ---------------------------------------------------------------------------
// Shared internal type
// ---------------------------------------------------------------------------

export type ProductAmountEntry = {
  amount: number;
  description: string;
  unit: UnitCRM;
  unitConfigDisplay: UnitConfigDisplay;
};

// ---------------------------------------------------------------------------
// actualUsedByProduct helpers
// ---------------------------------------------------------------------------

/**
 * Accumulates an amount into a product map, summing if the product already exists.
 */
function accumulateProduct(
  productMap: Map<number, ProductAmountEntry>,
  productId: number,
  amount: number,
  description: string,
  unit: UnitCRM,
  unitConfigDisplay: UnitConfigDisplay,
) {
  const existing = productMap.get(productId);
  if (existing) {
    existing.amount += amount;
  } else {
    productMap.set(productId, { amount, description, unit, unitConfigDisplay });
  }
}

/**
 * Back-calculates per-chemical usage from an equipment entry using the mix ratio.
 *
 * The tech measures total mix consumed at the tank level (startAmount − finishAmount).
 * Since individual constituent amounts cannot be measured after mixing, we derive them
 * by scaling each constituent's plannedAmount by the fraction of the tank that was used.
 *
 * Water carrier (WATER_PRODUCT_ID) is excluded — it is not a product the tech tracks.
 */
function accumulateEquipmentConstituents(
  productMap: Map<number, ProductAmountEntry>,
  equipment: LoadoutFinal["masters"][number]["equipments"][number],
) {
  const scaledConstituents = equipment.plannedMixture.scaleByUsage(
    equipment.startAmount,
    equipment.finishAmount,
    equipment.plannedAmount,
  );

  for (const { constituent, amount } of scaledConstituents) {
    if (constituent.product.productId === WATER_PRODUCT_ID) continue;
    accumulateProduct(
      productMap,
      constituent.product.productId,
      amount,
      constituent.product.description,
      constituent.unit,
      constituent.product.unitConfigDisplay as UnitConfigDisplay,
    );
  }
}

/**
 * Derives the actual ksf treated for a master product from one equipment entry.
 *
 * The Mixture's planned volume covers the master's planned ksf at a fixed ratio.
 * If the tech used more or less mix than planned, the actual ksf scales proportionally:
 *
 *   usageRatio = (startAmount − finishAmount) / equipment.plannedAmount
 *   actualKsf  = usageRatio × master.plannedAmount
 *
 * Returns 0 if plannedAmount is 0 (avoids division by zero).
 */
function calcEquipmentActualKsf(
  equipment: LoadoutFinal["masters"][number]["equipments"][number],
  masterPlannedKsf: number,
): number {
  if (equipment.plannedAmount === 0) return 0;
  const usageRatio = (equipment.startAmount - equipment.finishAmount) / equipment.plannedAmount;
  return usageRatio * masterPlannedKsf;
}

/**
 * Builds a map of productId → amount from the finished loadout.
 *
 * This represents what the tech physically measured:
 *   - Master products: actual ksf treated, derived from equipment usage ratio × planned ksf
 *     (if the tech used 2× the planned mix volume, they treated 2× the planned ksf)
 *   - Equipment entries: per-chemical amounts back-calculated via the mix ratio
 *   - Standalone sub-products and singles: direct startAmount − finishAmount
 */
export function buildActualUsedByProduct(loadout: LoadoutFinal): Map<number, ProductAmountEntry> {
  const productMap = new Map<number, ProductAmountEntry>();

  for (const master of loadout.masters) {
    // Master product — actual ksf treated, summed across all equipment entries
    const actualKsf = master.equipments.reduce(
      (sum, equipment) => sum + calcEquipmentActualKsf(equipment, master.plannedAmount),
      0,
    );
    accumulateProduct(productMap, master.productId, actualKsf, master.product.description, master.unit, master.product.unitConfigDisplay as UnitConfigDisplay);

    for (const equipment of master.equipments) {
      accumulateEquipmentConstituents(productMap, equipment);
    }

    for (const sub of master.subProducts) {
      accumulateProduct(productMap, sub.productId, sub.startAmount - sub.finishAmount, sub.product.description, sub.unit, sub.product.unitConfigDisplay as UnitConfigDisplay);
    }
  }

  for (const single of loadout.singles) {
    accumulateProduct(productMap, single.productId, single.startAmount - single.finishAmount, single.product.description, single.unit, single.product.unitConfigDisplay as UnitConfigDisplay);
  }

  for (const sub of loadout.subProducts) {
    accumulateProduct(productMap, sub.productId, sub.startAmount - sub.finishAmount, sub.product.description, sub.unit, sub.product.unitConfigDisplay as UnitConfigDisplay);
  }

  return productMap;
}

// ---------------------------------------------------------------------------
// crmUsedByProduct helper
// ---------------------------------------------------------------------------

/**
 * Builds a map of productId → amount from RealGreen production records.
 *
 * These amounts are derived from service size (not physical measurement).
 * Source: completed[].production.usedAppProducts[].
 */
export function buildCrmUsedByProduct(completed: Service[]): Map<number, ProductAmountEntry> {
  const productMap = new Map<number, ProductAmountEntry>();

  for (const service of completed) {
    const usedAppProducts = service.production?.usedAppProducts;
    if (!usedAppProducts) continue;

    for (const appProduct of usedAppProducts) {
      const existing = productMap.get(appProduct.productId);
      if (existing) {
        existing.amount += appProduct.amount;
      } else {
        productMap.set(appProduct.productId, {
          amount: appProduct.amount,
          description: appProduct.productCommon.description,
          unit: appProduct.productCommon.unit,
          unitConfigDisplay: appProduct.productCommon.unitConfigDisplay as UnitConfigDisplay,
        });
      }
    }
  }

  return productMap;
}

// ---------------------------------------------------------------------------
// plannedUsedByProduct helper
// ---------------------------------------------------------------------------

/**
 * Builds a map of productId → planned amount sourced entirely from the loadout.
 *
 * The loadout is the authoritative source for planned amounts — all rates and
 * sizes were already resolved during loadout creation:
 *   - Masters: plannedAmount (ksf to be treated)
 *   - Equipment constituents: plannedAmount per chemical (rate × size, overlap-adjusted)
 *   - Master sub-products: plannedAmount (standalone chemicals not mixed into equipment)
 *
 * Water carrier (WATER_PRODUCT_ID) is excluded — it is not a product the tech tracks.
 */
export function buildPlannedUsedByProduct(loadout: LoadoutFinal): Map<number, ProductAmountEntry> {
  const productMap = new Map<number, ProductAmountEntry>();

  for (const master of loadout.masters) {
    // Master product itself — planned area in ksf
    accumulateProduct(
      productMap,
      master.productId,
      master.plannedAmount,
      master.product.description,
      master.unit,
      master.product.unitConfigDisplay as UnitConfigDisplay,
    );

    // Equipment constituents — per-chemical planned amounts (rate × size, overlap-adjusted)
    for (const equipment of master.equipments) {
      for (const constituent of equipment.constituents) {
        if (constituent.product.productId === WATER_PRODUCT_ID) continue;
        accumulateProduct(
          productMap,
          constituent.product.productId,
          constituent.plannedAmount,
          constituent.product.description,
          constituent.unit,
          constituent.product.unitConfigDisplay as UnitConfigDisplay,
        );
      }
    }

    // Standalone sub-products (not mixed into any equipment)
    for (const sub of master.subProducts) {
      accumulateProduct(
        productMap,
        sub.productId,
        sub.plannedAmount,
        sub.product.description,
        sub.unit,
        sub.product.unitConfigDisplay as UnitConfigDisplay,
      );
    }
  }

  return productMap;
}

// ---------------------------------------------------------------------------
// equipmentMixFeedback helper
// ---------------------------------------------------------------------------

/**
 * Returns per-equipment mix amounts for the feedback display.
 * Amounts are in the carrier's app unit (gallons).
 * unitConfigDisplay is sourced from the water carrier constituent (constituents[0]).
 */
export function buildEquipmentMixFeedback(loadout: LoadoutFinal): EquipmentMixFeedback[] {
  return loadout.masters.flatMap((master) =>
    master.equipments.map((equipment) => ({
      equipmentId: equipment.equipmentId,
      plannedAmount: equipment.plannedAmount,
      startAmount: equipment.startAmount,
      finishAmount: equipment.finishAmount,
      totalMixUsed: equipment.startAmount - equipment.finishAmount,
      unitConfigDisplay: equipment.constituents[0].product.unitConfigDisplay as UnitConfigDisplay,
    })),
  );
}

// ---------------------------------------------------------------------------
// productFeedback helper
// ---------------------------------------------------------------------------

function buildEntry(
  productId: number,
  actualMap: Map<number, ProductAmountEntry>,
  crmMap: Map<number, ProductAmountEntry>,
  plannedMap: Map<number, ProductAmountEntry>,
): ProductFeedbackEntry | null {
  const actual = actualMap.get(productId);
  const crm = crmMap.get(productId);
  const planned = plannedMap.get(productId);

  const actualUsed = actual?.amount ?? 0;
  const crmUsed = crm?.amount ?? 0;
  const plannedUsed = planned?.amount ?? 0;

  const description = actual?.description ?? crm?.description ?? planned?.description ?? `Product ${productId}`;
  const unit = actual?.unit ?? crm?.unit ?? planned?.unit;
  const unitConfigDisplay = actual?.unitConfigDisplay ?? crm?.unitConfigDisplay ?? planned?.unitConfigDisplay;

  if (!unit || !unitConfigDisplay) return null;

  return {
    productId,
    description,
    unit,
    unitConfigDisplay,
    actualUsed,
    crmUsed,
    plannedUsed,
    actualVsCrm: actualUsed - crmUsed,
    actualVsPlanned: actualUsed - plannedUsed,
  };
}

/**
 * Merges the three product maps into a grouped per-master feedback array.
 *
 * Master products (from loadout.masters) are the top-level rows. Their sub-products
 * (equipment constituents + standalone sub-products) are nested beneath them.
 * Any products not associated with a master (singles, top-level subProducts) are
 * appended as standalone master entries with no sub-products.
 */
export function buildProductFeedback(
  actualMap: Map<number, ProductAmountEntry>,
  crmMap: Map<number, ProductAmountEntry>,
  plannedMap: Map<number, ProductAmountEntry>,
  loadout: LoadoutFinal,
): MasterProductFeedbackEntry[] {
  // Track which productIds have been assigned to a master to catch orphans
  const assignedIds = new Set<number>();

  const masterEntries: MasterProductFeedbackEntry[] = [];

  for (const master of loadout.masters) {
    assignedIds.add(master.productId);

    const masterEntry = buildEntry(master.productId, actualMap, crmMap, plannedMap);
    if (!masterEntry) continue;

    // Collect sub-product IDs for this master: constituents (non-water) + standalone sub-products
    const subProductIds = new Set<number>();
    for (const equipment of master.equipments) {
      for (const constituent of equipment.constituents) {
        if (constituent.product.productId !== WATER_PRODUCT_ID) {
          subProductIds.add(constituent.product.productId);
        }
      }
    }
    for (const sub of master.subProducts) {
      subProductIds.add(sub.productId);
    }

    const subProducts: ProductFeedbackEntry[] = [];
    for (const subId of subProductIds) {
      assignedIds.add(subId);
      const subEntry = buildEntry(subId, actualMap, crmMap, plannedMap);
      if (subEntry) subProducts.push(subEntry);
    }

    masterEntries.push({ ...masterEntry, subProducts });
  }

  // Orphaned products (singles, top-level subProducts, or CRM-only products)
  const allProductIds = new Set<number>([
    ...actualMap.keys(),
    ...crmMap.keys(),
    ...plannedMap.keys(),
  ]);

  for (const productId of allProductIds) {
    if (assignedIds.has(productId)) continue;
    const entry = buildEntry(productId, actualMap, crmMap, plannedMap);
    if (entry) masterEntries.push({ ...entry, subProducts: [] });
  }

  return masterEntries;
}
