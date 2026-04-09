import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutFinal } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import {
  EquipmentChemicalFeedback,
  EquipmentMixFeedback,
  GranularSubProductFeedback,
} from "./LoadoutFeedback";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

// ---------------------------------------------------------------------------
// equipmentMixFeedback
// ---------------------------------------------------------------------------

/**
 * Returns per-equipment tank-level amounts (planned, start, finish, used).
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
// equipmentChemicalFeedback
// ---------------------------------------------------------------------------

/**
 * Returns per-chemical back-calculated amounts for all tank-mixed equipment entries.
 *
 * The tech measures total mix consumed at the tank level (startAmount − finishAmount).
 * Individual chemical amounts are derived by scaling each constituent's plannedAmount
 * by the fraction of the tank that was used:
 *
 *   usageRatio = (startAmount − finishAmount) / equipment.plannedAmount
 *   actualAmount = usageRatio × constituent.plannedAmount
 *
 * Water carrier (WATER_PRODUCT_ID) is excluded.
 */
export function buildEquipmentChemicalFeedback(loadout: LoadoutFinal): EquipmentChemicalFeedback[] {
  const rows: EquipmentChemicalFeedback[] = [];

  for (const master of loadout.masters) {
    for (const equipment of master.equipments) {
      const scaledConstituents = equipment.plannedMixture.scaleByUsage(
        equipment.startAmount,
        equipment.finishAmount,
        equipment.plannedAmount,
      );

      // scaleMixture always returns [carrier, ...solutes] — skip index 0 (water carrier)
      for (const { constituent, amount } of scaledConstituents.slice(1)) {
        rows.push({
          equipmentId: equipment.equipmentId,
          productId: constituent.product.productId,
          description: constituent.product.description,
          unit: constituent.unit,
          unitConfigDisplay: constituent.product.unitConfigDisplay as UnitConfigDisplay,
          plannedAmount: constituent.plannedAmount,
          actualAmount: amount,
        });
      }
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// granularFeedback
// ---------------------------------------------------------------------------

/**
 * Determines which productMasterIds apply to a service based on its size and the
 * ServCode's productRules. Returns the set of applicable master product IDs.
 *
 * Rules are evaluated in order; the first matching rule wins.
 * sizeOperator "all" matches any size.
 * sizeOperator "lte" matches when service.size <= rule.size.
 * sizeOperator "gt" matches when service.size > rule.size.
 */
function getApplicableProductMasterIds(service: Service): Set<number> {
  for (const rule of service.servCode.productRules) {
    const matches =
      rule.sizeOperator === "all" ||
      (rule.sizeOperator === "lte" && service.size <= rule.size) ||
      (rule.sizeOperator === "gt" && service.size > rule.size);
    if (matches) {
      return new Set(rule.productMasterIds);
    }
  }
  return new Set();
}

/**
 * Builds flat per-sub-product feedback rows for granular masters (masters with no equipment).
 *
 * For each sub-product across all granular masters:
 *   - plannedRate = constituent.plannedAmount / master.plannedAmount (units per ksf)
 *     If the same sub-product appears in multiple granular masters, the rate is
 *     weighted by each master's planned ksf.
 *   - completedKsf = sum of service.size for completed services whose ServCode
 *     productRules include this master's productId
 *   - plannedUsed = plannedRate × completedKsf
 *   - actualUsed = startAmount − finishAmount (from the loadout sub-product entry)
 *   - crmUsed = sum of production.usedAppProducts[].amount for this productId
 *     across all completed services
 */
export function buildGranularFeedback(
  completed: Service[],
  scheduled: Service[],
  loadout: LoadoutFinal,
): GranularSubProductFeedback[] {
  // Only granular masters (no equipment entries)
  const granularMasters = loadout.masters.filter((m) => m.equipments.length === 0);
  if (granularMasters.length === 0) return [];

  // Build per-master-product size totals for completed services
  const completedSizeByMaster = new Map<number, number>();
  const scheduledSizeByMaster = new Map<number, number>();

  for (const service of scheduled) {
    const applicableIds = getApplicableProductMasterIds(service);
    for (const masterId of applicableIds) {
      scheduledSizeByMaster.set(masterId, (scheduledSizeByMaster.get(masterId) ?? 0) + service.size);
    }
  }

  for (const service of completed) {
    const applicableIds = getApplicableProductMasterIds(service);
    for (const masterId of applicableIds) {
      completedSizeByMaster.set(masterId, (completedSizeByMaster.get(masterId) ?? 0) + service.size);
    }
  }

  // Build CRM used map from completed services
  const crmUsedBySubProduct = new Map<number, number>();
  for (const service of completed) {
    const usedAppProducts = service.production?.usedAppProducts;
    if (!usedAppProducts) continue;
    for (const appProduct of usedAppProducts) {
      crmUsedBySubProduct.set(
        appProduct.productId,
        (crmUsedBySubProduct.get(appProduct.productId) ?? 0) + appProduct.amount,
      );
    }
  }

  // Accumulate weighted planned rate and actual used per sub-product across granular masters
  type SubAccumulator = {
    weightedRateNumerator: number; // Σ(plannedAmount_sub)
    weightedRateDenominator: number; // Σ(plannedAmount_master) — for rate weighting
    completedKsf: number;
    actualUsed: number;
    // metadata from first encounter
    description: string;
    unit: GranularSubProductFeedback["unit"];
    unitConfigDisplay: UnitConfigDisplay;
  };

  const subAccMap = new Map<number, SubAccumulator>();

  for (const master of granularMasters) {
    const masterPlannedKsf = master.plannedAmount;
    if (masterPlannedKsf === 0) continue;

    const scheduledSize = scheduledSizeByMaster.get(master.productId) ?? 0;
    const completedSize = completedSizeByMaster.get(master.productId) ?? 0;
    // Completed ksf for this master, scaled from the loadout's planned ksf
    const completedKsf =
      scheduledSize > 0 ? (completedSize / scheduledSize) * masterPlannedKsf : 0;

    for (const sub of master.subProducts) {
      const existing = subAccMap.get(sub.productId);
      const actualUsed = sub.startAmount - sub.finishAmount;

      if (existing) {
        existing.weightedRateNumerator += sub.plannedAmount;
        existing.weightedRateDenominator += masterPlannedKsf;
        existing.completedKsf += completedKsf;
        existing.actualUsed += actualUsed;
      } else {
        subAccMap.set(sub.productId, {
          weightedRateNumerator: sub.plannedAmount,
          weightedRateDenominator: masterPlannedKsf,
          completedKsf,
          actualUsed,
          description: sub.product.description,
          unit: sub.unit,
          unitConfigDisplay: sub.product.unitConfigDisplay as UnitConfigDisplay,
        });
      }
    }
  }

  const rows: GranularSubProductFeedback[] = [];

  for (const [productId, acc] of subAccMap) {
    const plannedRate =
      acc.weightedRateDenominator > 0
        ? acc.weightedRateNumerator / acc.weightedRateDenominator
        : 0;
    const plannedUsed = plannedRate * acc.completedKsf;
    const crmUsed = crmUsedBySubProduct.get(productId) ?? 0;

    rows.push({
      productId,
      description: acc.description,
      unit: acc.unit,
      unitConfigDisplay: acc.unitConfigDisplay,
      plannedRate,
      plannedUsed,
      actualUsed: acc.actualUsed,
      crmUsed,
      actualVsCrm: acc.actualUsed - crmUsed,
      actualVsPlanned: acc.actualUsed - plannedUsed,
    });
  }

  return rows.sort((a, b) => a.description.localeCompare(b.description));
}
