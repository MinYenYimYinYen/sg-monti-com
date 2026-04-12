import { LoadoutActuals } from "@/app/loadout/LoadoutTypes";
import { OtherSubProductFeedback } from "../LoadoutFeedback";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

type ActualsOtherMaster = LoadoutActuals["otherMasters"][number];
type ActualsOtherSubProduct = ActualsOtherMaster["subProducts"][number];

type SubAccumulator = {
  weightedRateNumerator: number;
  weightedRateDenominator: number;
  startAmount: number;
  finishAmount: number;
  actualUsed: number;
  completedKsf: number;
  postedAmount: number;
  discrepantServiceIds: Set<number>;
  description: string;
  unit: OtherSubProductFeedback["unit"];
  unitConfigDisplay: UnitConfigDisplay;
};

type SubProductStats = {
  completedKsf: number;
  postedAmount: number;
  discrepantServiceIds: Set<number>;
};

/**
 * Iterates matched services for a sub-product to compute completedKsf, postedAmount,
 * and the set of servIds where ap.treated !== service.size (stale tablet data).
 */
function subProductStatsFromServices(
  sub: ActualsOtherSubProduct,
  rate: number,
): SubProductStats {
  let completedKsf = 0;
  let postedAmount = 0;
  const discrepantServiceIds = new Set<number>();

  for (const service of sub.matchedServices) {
    const ap = service.production?.usedAppProducts?.find(
      (p) => p.productId === sub.productId,
    );
    if (ap) {
      completedKsf += service.size;
      postedAmount += service.size * rate;
      // ap.treated !== service.size means the tablet recorded a stale treated area —
      // amounts for this service are suspect.
      if (ap.treated !== service.size) discrepantServiceIds.add(service.servId);
    }
  }

  return { completedKsf, postedAmount, discrepantServiceIds };
}

/** Merges a sub-product's stats into an existing accumulator entry. */
function mergeSubProductIntoAccumulator(
  acc: SubAccumulator,
  sub: ActualsOtherSubProduct,
  masterPlannedKsf: number,
  stats: SubProductStats,
): void {
  acc.weightedRateNumerator += sub.plannedAmount;
  acc.weightedRateDenominator += masterPlannedKsf;
  acc.startAmount += sub.startAmount;
  acc.finishAmount += sub.finishAmount;
  acc.actualUsed += sub.startAmount - sub.finishAmount;
  acc.completedKsf += stats.completedKsf;
  acc.postedAmount += stats.postedAmount;
  for (const id of stats.discrepantServiceIds) acc.discrepantServiceIds.add(id);
}

/** Builds the final OtherSubProductFeedback row from a completed accumulator entry. */
function otherSubProductFeedbackRow(
  productId: number,
  acc: SubAccumulator,
): OtherSubProductFeedback {
  const plannedRate =
    acc.weightedRateDenominator > 0
      ? acc.weightedRateNumerator / acc.weightedRateDenominator
      : 0;
  const plannedUsed = plannedRate * acc.completedKsf;

  return {
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
    discrepantServiceIds: acc.discrepantServiceIds,
    actualVsPosted: acc.actualUsed - acc.postedAmount,
    actualVsPlanned: acc.actualUsed - plannedUsed,
  };
}

/**
 * Builds the sub-product accumulator map by iterating all other masters and their sub-products.
 * Sub-products that appear in multiple masters are merged into a single accumulator entry.
 */
function buildSubAccumulatorMap(
  otherMasters: LoadoutActuals["otherMasters"],
): Map<number, SubAccumulator> {
  const subAccMap = new Map<number, SubAccumulator>();

  for (const master of otherMasters) {
    const masterPlannedKsf = master.plannedAmount;
    if (masterPlannedKsf === 0) continue;

    for (const sub of master.subProducts) {
      // Derive the label rate from ProductMaster.subProductConfigs rather than ap.amount.
      // ap.amount is unreliable — techs enter incorrect values on the CRM tablet.
      const subConfig = master.product.subProductConfigs.find(
        (config) => config.subId === sub.productId,
      );
      const rate = subConfig?.rate ?? 0;
      const stats = subProductStatsFromServices(sub, rate);
      const existing = subAccMap.get(sub.productId);

      if (existing) {
        mergeSubProductIntoAccumulator(existing, sub, masterPlannedKsf, stats);
      } else {
        subAccMap.set(sub.productId, {
          weightedRateNumerator: sub.plannedAmount,
          weightedRateDenominator: masterPlannedKsf,
          startAmount: sub.startAmount,
          finishAmount: sub.finishAmount,
          actualUsed: sub.startAmount - sub.finishAmount,
          completedKsf: stats.completedKsf,
          postedAmount: stats.postedAmount,
          discrepantServiceIds: stats.discrepantServiceIds,
          description: sub.product.description,
          unit: sub.unit,
          unitConfigDisplay: sub.product.unitConfigDisplay as UnitConfigDisplay,
        });
      }
    }
  }

  return subAccMap;
}

/**
 * Builds flat per-sub-product feedback rows for other masters (masters with no equipment).
 * Sub-products appearing in multiple masters are merged into a single row.
 */
export function buildOtherFeedback(actuals: LoadoutActuals): OtherSubProductFeedback[] {
  if (actuals.otherMasters.length === 0) return [];
  const subAccMap = buildSubAccumulatorMap(actuals.otherMasters);
  return [...subAccMap.entries()]
    .map(([productId, acc]) => otherSubProductFeedbackRow(productId, acc))
    .sort((a, b) => a.description.localeCompare(b.description));
}
