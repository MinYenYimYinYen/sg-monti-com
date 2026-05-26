import { LoadoutReportEntry } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/LoadoutReportTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Summary types
// ---------------------------------------------------------------------------

/** Per-date breakdown for a single equipment entry — used in the drill-down popover. */
export type EquipmentDateBreakdown = {
  routeDate: string;
  startAmount: number;
  finishAmount: number;
  totalMixUsed: number;
  completedKsf: number;
  expectedMixUsed: number | null;
  /** Human-readable app method name for diagnosing coverage rate issues. */
  appMethodName: string;
  /** coverage.volume / coverage.area — gallons (or app unit) per ksf. */
  coverageRate: number;
  unitLabel: string;
  /** Services matched to this equipment master on this date. */
  matchedServices: Service[];
};

export type EquipmentSummary = {
  equipmentId: string;
  totalMixUsed: number;
  expectedMixUsed: number;
  /** totalMixUsed − expectedMixUsed. Positive = tech used more than expected. */
  mixVsExpected: number;
  /** mixVsExpected / expectedMixUsed. Null when expectedMixUsed = 0. */
  mixVsExpectedPct: number | null;
  /** App unit label (e.g. "Gal") for displaying actual/expected amounts. */
  unitLabel: string;
  /** Per-date breakdown for the drill-down popover. */
  perDateBreakdown: EquipmentDateBreakdown[];
};

export type ProductSummary = {
  productId: number;
  description: string;
  actualUsed: number;
  postedAmount: number;
  /** actualUsed − postedAmount. Positive = tech physically used more than posted. */
  actualVsPosted: number;
  /** actualVsPosted / postedAmount. Null when postedAmount = 0. */
  actualVsPostedPct: number | null;
};

export type EntrySummary = {
  passCount: number;
  failCount: number;
  noRuleCount: number;
  /** passCount / (passCount + failCount). Null when no rule-applicable services. */
  complianceRate: number | null;
  /** One entry per equipment ID, summed across all entries. */
  equipmentSummaries: EquipmentSummary[];
  /** One entry per productId, summed across all entries. */
  productSummaries: ProductSummary[];
};

// ---------------------------------------------------------------------------
// summarizeEntries
// ---------------------------------------------------------------------------

/**
 * Aggregates compliance and product usage across one or more LoadoutReportEntries.
 *
 * Equipment mix: sums totalMixUsed and expectedMixUsed per equipmentId across entries.
 * Other products: sums actualUsed and postedAmount per productId across entries.
 * Ratios are computed from the summed totals (not averaged), giving a weighted aggregate.
 *
 * Three-Way used in a tank mix appears in equipmentSummaries (as part of tank volume).
 * Three-Way used standalone appears in productSummaries (as oz/lbs vs posted).
 * These are kept separate because they measure different things.
 */
export function summarizeEntries(entries: LoadoutReportEntry[]): EntrySummary {
  let passCount = 0;
  let failCount = 0;
  let noRuleCount = 0;

  // Accumulator maps keyed by equipmentId and productId
  const equipmentAccMap = new Map<string, {
    totalMixUsed: number;
    expectedMixUsed: number;
    unitLabel: string;
    perDateBreakdown: EquipmentDateBreakdown[];
  }>();
  const productAccMap = new Map<number, { description: string; actualUsed: number; postedAmount: number }>();

  for (const entry of entries) {
    // Compliance
    for (const service of entry.completedServices) {
      const result = service.x.productRuleCompliance;
      if (result === "pass") passCount++;
      else if (result === "fail") failCount++;
      else noRuleCount++;
    }

    // Equipment mix — also build per-date breakdown for the drill-down popover
    for (let masterIdx = 0; masterIdx < entry.actuals.equipmentMasters.length; masterIdx++) {
      const master = entry.actuals.equipmentMasters[masterIdx];
      const mixRow = entry.feedback.equipmentMixFeedback[masterIdx];
      if (!mixRow) continue;

      // Coverage rate is embedded in the appMethod on the equipment entry in the loadout
      const equipmentEntry = entry.loadout.masters
        .find((m) => m.equipments.some((e) => e.equipmentId === mixRow.equipmentId))
        ?.equipments.find((e) => e.equipmentId === mixRow.equipmentId);
      const appMethod = equipmentEntry?.appMethod;
      const coverageRate =
        appMethod && appMethod.coverage.area > 0
          ? appMethod.coverage.volume / appMethod.coverage.area
          : 0;
      // appMethod is DeepNonNullable<AppMethod> in LoadoutFinal — use appMethodId as the display name
      const appMethodName = appMethod?.appMethodId ?? mixRow.equipmentId;

      const breakdown: EquipmentDateBreakdown = {
        routeDate: entry.routeDate,
        startAmount: mixRow.startAmount,
        finishAmount: mixRow.finishAmount,
        totalMixUsed: mixRow.totalMixUsed,
        completedKsf: mixRow.completedKsf,
        expectedMixUsed: mixRow.expectedMixUsed,
        appMethodName,
        coverageRate,
        unitLabel: mixRow.unitConfigDisplay.getUnitLabel("app"),
        matchedServices: master.matchedServices,
      };

      const existing = equipmentAccMap.get(mixRow.equipmentId);
      if (existing) {
        existing.totalMixUsed += mixRow.totalMixUsed;
        existing.expectedMixUsed += mixRow.expectedMixUsed ?? 0;
        existing.perDateBreakdown.push(breakdown);
      } else {
        equipmentAccMap.set(mixRow.equipmentId, {
          totalMixUsed: mixRow.totalMixUsed,
          expectedMixUsed: mixRow.expectedMixUsed ?? 0,
          unitLabel: mixRow.unitConfigDisplay.getUnitLabel("app"),
          perDateBreakdown: [breakdown],
        });
      }
    }

    // Other products (standalone sub-products)
    for (const productRow of entry.feedback.otherFeedback) {
      const existing = productAccMap.get(productRow.productId);
      if (existing) {
        existing.actualUsed += productRow.actualUsed;
        existing.postedAmount += productRow.postedAmount;
      } else {
        productAccMap.set(productRow.productId, {
          description: productRow.description,
          actualUsed: productRow.actualUsed,
          postedAmount: productRow.postedAmount,
        });
      }
    }
  }

  const complianceTotal = passCount + failCount;
  const complianceRate = complianceTotal > 0 ? passCount / complianceTotal : null;

  const equipmentSummaries: EquipmentSummary[] = Array.from(
    equipmentAccMap.entries(),
  ).map(([equipmentId, acc]) => {
    const mixVsExpected = acc.totalMixUsed - acc.expectedMixUsed;
    return {
      equipmentId,
      totalMixUsed: acc.totalMixUsed,
      expectedMixUsed: acc.expectedMixUsed,
      mixVsExpected,
      mixVsExpectedPct: acc.expectedMixUsed > 0 ? mixVsExpected / acc.expectedMixUsed : null,
      unitLabel: acc.unitLabel,
      perDateBreakdown: acc.perDateBreakdown,
    };
  });

  const productSummaries: ProductSummary[] = Array.from(
    productAccMap.entries(),
  )
    .map(([productId, acc]) => {
      const actualVsPosted = acc.actualUsed - acc.postedAmount;
      return {
        productId,
        description: acc.description,
        actualUsed: acc.actualUsed,
        postedAmount: acc.postedAmount,
        actualVsPosted,
        actualVsPostedPct: acc.postedAmount > 0 ? actualVsPosted / acc.postedAmount : null,
      };
    })
    .sort((a, b) => a.description.localeCompare(b.description));

  return {
    passCount,
    failCount,
    noRuleCount,
    complianceRate,
    equipmentSummaries,
    productSummaries,
  };
}
