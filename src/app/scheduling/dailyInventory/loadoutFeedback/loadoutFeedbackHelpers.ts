import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutActuals, LoadoutFinal } from "@/app/loadout/LoadoutTypes";
import {
  EquipmentChemicalFeedback,
  EquipmentMixFeedback,
  OtherSubProductFeedback,
} from "./LoadoutFeedback";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

// ---------------------------------------------------------------------------
// buildLoadoutActuals
// ---------------------------------------------------------------------------

/**
 * Matches completed services to their corresponding loadout entries by productId,
 * returning a LoadoutActuals tree with Service objects attached to each entry.
 *
 * Equipment masters: a service matches when its usedAppProducts is a superset of
 * the master's non-water constituent productIds (prevents double-counting when a
 * product appears in multiple masters).
 *
 * Other masters (no equipment): each sub-product's services are matched when
 * usedAppProducts contains that sub-product's productId.
 *
 * Services that don't match any loadout entry are collected in unmatchedServices.
 */
export function buildLoadoutActuals(
  completed: Service[],
  loadout: LoadoutFinal,
): LoadoutActuals {
  const equipmentMasterDefs = loadout.masters.filter((m) => m.equipments.length > 0);
  const otherMasterDefs = loadout.masters.filter((m) => m.equipments.length === 0);

  // Pre-compute constituent sets for each equipment master (excluding water carrier at index 0)
  const equipmentConstituentSets = equipmentMasterDefs.map((master) =>
    new Set(master.equipments[0].constituents.slice(1).map((c) => c.product.productId)),
  );

  // Pre-compute sub-product productId sets for other masters
  const otherSubProductIdSets = otherMasterDefs.map((master) =>
    new Set(master.subProducts.map((sub) => sub.productId)),
  );

  // Initialize matched service arrays
  const equipmentMatchedServices: Service[][] = equipmentMasterDefs.map(() => []);
  const otherSubMatchedServices: Service[][][] = otherMasterDefs.map((master) =>
    master.subProducts.map(() => []),
  );
  const unmatchedServices: Service[] = [];

  for (const service of completed) {
    const usedAppProducts = service.production?.usedAppProducts;
    if (!usedAppProducts || usedAppProducts.length === 0) {
      unmatchedServices.push(service);
      continue;
    }

    const serviceProductIds = new Set(usedAppProducts.map((ap) => ap.productId));
    let matched = false;

    // Try to match to an equipment master
    for (let i = 0; i < equipmentMasterDefs.length; i++) {
      const constituentIds = equipmentConstituentSets[i];
      if (constituentIds.size === 0) continue;
      const isMatch = [...constituentIds].every((id) => serviceProductIds.has(id));
      if (isMatch) {
        equipmentMatchedServices[i].push(service);
        matched = true;
      }
    }

    // Try to match to other master sub-products (independent of equipment match)
    for (let i = 0; i < otherMasterDefs.length; i++) {
      const master = otherMasterDefs[i];
      for (let j = 0; j < master.subProducts.length; j++) {
        if (serviceProductIds.has(master.subProducts[j].productId)) {
          otherSubMatchedServices[i][j].push(service);
          matched = true;
        }
      }
    }

    if (!matched) {
      unmatchedServices.push(service);
    }
  }

  return {
    equipmentMasters: equipmentMasterDefs.map((master, i) => ({
      ...master,
      subProducts: master.subProducts,
      matchedServices: equipmentMatchedServices[i],
    })),
    otherMasters: otherMasterDefs.map((master, i) => ({
      ...master,
      subProducts: master.subProducts.map((sub, j) => ({
        ...sub,
        matchedServices: otherSubMatchedServices[i][j],
      })),
    })),
    unmatchedServices,
  };
}

// ---------------------------------------------------------------------------
// equipmentMixFeedback
// ---------------------------------------------------------------------------

/**
 * Derives per-equipment tank-level feedback rows from LoadoutActuals.
 * completedKsf is the sum of appProduct.size for the first constituent across
 * all matched services (all constituents share the same treated area per service).
 */
export function buildEquipmentMixFeedback(actuals: LoadoutActuals): EquipmentMixFeedback[] {
  const rows: EquipmentMixFeedback[] = [];

  for (const master of actuals.equipmentMasters) {
    // Compute completedKsf from matched services using the first non-water constituent
    const firstConstituentId = master.equipments[0]?.constituents[1]?.product.productId;
    let completedKsf = 0;
    if (firstConstituentId !== undefined) {
      for (const service of master.matchedServices) {
        const ap = service.production?.usedAppProducts?.find(
          (p) => p.productId === firstConstituentId,
        );
        if (ap) completedKsf += service.size;
      }
    }

    for (const equipment of master.equipments) {
      const totalMixUsed = equipment.startAmount - equipment.finishAmount;
      const { coverage } = equipment.appMethod;
      // coverage.volume / coverage.area = gallons per ksf (same unit as startAmount/finishAmount)
      const coverageRate = coverage.area > 0 ? coverage.volume / coverage.area : 0;
      const expectedMixUsed = completedKsf > 0 && coverageRate > 0
        ? coverageRate * completedKsf
        : null;
      const mixVsExpected = expectedMixUsed !== null ? totalMixUsed - expectedMixUsed : null;

      rows.push({
        equipmentId: equipment.equipmentId,
        completedKsf,
        plannedAmount: equipment.plannedAmount,
        startAmount: equipment.startAmount,
        finishAmount: equipment.finishAmount,
        totalMixUsed,
        expectedMixUsed,
        mixVsExpected,
        unitConfigDisplay: equipment.constituents[0].product.unitConfigDisplay as UnitConfigDisplay,
      });
    }
  }

  return rows;
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
export function buildEquipmentChemicalFeedback(actuals: LoadoutActuals): EquipmentChemicalFeedback[] {
  const rows: EquipmentChemicalFeedback[] = [];

  for (const master of actuals.equipmentMasters) {
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
// otherFeedback (formerly granularFeedback)
// ---------------------------------------------------------------------------

/**
 * Builds flat per-sub-product feedback rows for other masters (masters with no equipment).
 *
 * For each sub-product across all other masters:
 *   - completedKsf = Σ service.size for matched services that used this sub-product
 *   - plannedRate = sub.plannedAmount / master.plannedAmount (units per ksf)
 *   - plannedUsed = plannedRate × completedKsf
 *   - actualUsed = startAmount − finishAmount (from the loadout sub-product entry)
 *   - postedAmount = Σ (service.size × subProductConfig.rate) — derived from the rate stored on
 *     ProductMaster.subProductConfigs rather than ap.amount, which is unreliable due to
 *     unexpected CRM tablet entry behaviour.
 */
export function buildOtherFeedback(actuals: LoadoutActuals): OtherSubProductFeedback[] {
  if (actuals.otherMasters.length === 0) return [];

  // Accumulate per sub-product across all other masters
  type SubAccumulator = {
    weightedRateNumerator: number;
    weightedRateDenominator: number;
    startAmount: number;
    finishAmount: number;
    actualUsed: number;
    completedKsf: number;
    postedAmount: number;
    description: string;
    unit: OtherSubProductFeedback["unit"];
    unitConfigDisplay: UnitConfigDisplay;
  };

  const subAccMap = new Map<number, SubAccumulator>();

  for (const master of actuals.otherMasters) {
    const masterPlannedKsf = master.plannedAmount;
    if (masterPlannedKsf === 0) continue;

    for (const sub of master.subProducts) {
      // Derive the label rate from ProductMaster.subProductConfigs rather than ap.amount.
      // ap.amount is unreliable — techs enter incorrect values on the CRM tablet.
      const subConfig = master.product.subProductConfigs.find(
        (config) => config.subId === sub.productId,
      );
      const rate = subConfig?.rate ?? 0;

      // Compute completedKsf and postedAmount from matched services for this sub-product
      let completedKsf = 0;
      let postedAmount = 0;
      for (const service of sub.matchedServices) {
        const ap = service.production?.usedAppProducts?.find(
          (p) => p.productId === sub.productId,
        );
        if (ap) {
          completedKsf += service.size;
          postedAmount += service.size * rate;

          const treatedDiff = ap.treated - service.size;
          const expectedAmount = service.size * rate;
          const amountDiff = ap.amount - expectedAmount;
          if (Math.abs(treatedDiff) >= 0.1 || Math.abs(amountDiff) >= 0.01) {
            console.log("[loadoutFeedback] discrepancy", {
              servId: service.servId,
              customer: service.x.customer.displayName,
              productId: sub.productId,
              "ap.treated": ap.treated,
              "service.size": service.size,
              treatedDiff,
              "ap.amount": ap.amount,
              expectedAmount,
              amountDiff,
              rate,
            });
          }
        }
      }

      const actualUsed = sub.startAmount - sub.finishAmount;
      const existing = subAccMap.get(sub.productId);

      if (existing) {
        existing.weightedRateNumerator += sub.plannedAmount;
        existing.weightedRateDenominator += masterPlannedKsf;
        existing.startAmount += sub.startAmount;
        existing.finishAmount += sub.finishAmount;
        existing.actualUsed += actualUsed;
        existing.completedKsf += completedKsf;
        existing.postedAmount += postedAmount;
      } else {
        subAccMap.set(sub.productId, {
          weightedRateNumerator: sub.plannedAmount,
          weightedRateDenominator: masterPlannedKsf,
          startAmount: sub.startAmount,
          finishAmount: sub.finishAmount,
          actualUsed,
          completedKsf,
          postedAmount,
          description: sub.product.description,
          unit: sub.unit,
          unitConfigDisplay: sub.product.unitConfigDisplay as UnitConfigDisplay,
        });
      }
    }
  }

  const rows: OtherSubProductFeedback[] = [];

  for (const [productId, acc] of subAccMap) {
    const plannedRate =
      acc.weightedRateDenominator > 0
        ? acc.weightedRateNumerator / acc.weightedRateDenominator
        : 0;
    const plannedUsed = plannedRate * acc.completedKsf;

    rows.push({
      productId,
      description: acc.description,
      unit: acc.unit,
      unitConfigDisplay: acc.unitConfigDisplay,
      plannedRate,
      plannedUsed,
      startAmount: acc.startAmount,
      finishAmount: acc.finishAmount,
      actualUsed: acc.actualUsed,
      completedKsf: acc.completedKsf,
      postedAmount: acc.postedAmount,
      actualVsPosted: acc.actualUsed - acc.postedAmount,
      actualVsPlanned: acc.actualUsed - plannedUsed,
    });
  }

  return rows.sort((a, b) => a.description.localeCompare(b.description));
}
