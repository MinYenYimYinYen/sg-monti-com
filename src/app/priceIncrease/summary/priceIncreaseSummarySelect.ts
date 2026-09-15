import { createSelector } from "@reduxjs/toolkit";
import { customerIncreaseResultsSelect } from "@/app/priceIncrease/results/customerIncreaseResultsSelect";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { CustomerIncreaseResult, PreExistingFlagStatus } from "@/app/priceIncrease/results/customerIncreaseResultsTypes";
import { IncreaseFlag } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import { groupCustomerIncreaseResults } from "@/app/priceIncrease/results/customerIncreaseGroupFns";
import { roundToNickel } from "@/lib/primatives/numbers/round";
import { SummaryFlagPerspective } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSlice";

// ---------------------------------------------------------------------------
// Revenue snapshot types
// ---------------------------------------------------------------------------

/**
 * Revenue snapshot for a group of customers.
 * currentRevenue: sum of service.nextPrice (what they pay now)
 * projectedRevenue: sum of roundToNickel(nextPrice * (1 + flagPercent/100)) per service
 * revenueDelta: projectedRevenue - currentRevenue
 * revenueDeltaPercent: revenueDelta / currentRevenue * 100 (blended effective increase %)
 */
export type RevenueSnapshot = {
  currentRevenue: number;
  projectedRevenue: number;
  revenueDelta: number;
  revenueDeltaPercent: number;
};

export type FlagGroupSummary = RevenueSnapshot & {
  /** Display label for this group */
  label: string;
  /** The flag for this group (null = "No Flag" / "Unassigned" / "Conflict") */
  flag: IncreaseFlag | null;
  customerCount: number;
};

export type GroupSummary = RevenueSnapshot & {
  label: string;
  customerCount: number;
};

export type PriceIncreaseSummary = {
  // Grand totals — non-exempt customers only (the real increase)
  grand: RevenueSnapshot;
  totalCustomers: number;

  // Status counts
  exemptCount: number;
  conflictCount: number;
  needsManualAttentionCount: number;
  belowAcquisitionCount: number;
  overpricedCount: number;
  noFlagCount: number;

  // Pre-existing flag status breakdown
  flagStatusCounts: Record<PreExistingFlagStatus, number>;

  /**
   * Opportunity cost — what exempt customers would contribute if their exemption
   * were removed. Uses cappedPercent as the hypothetical increase per service.
   * Kept separate from grand totals to avoid polluting actual increase numbers.
   */
  exemptOpportunity: RevenueSnapshot;

  // Three flag perspectives — always computed, non-exempt customers only
  /** By effectiveFlag: what the run will produce (planned outcome) */
  byEffectiveFlag: FlagGroupSummary[];
  /** By preExistingIncreaseFlags[0]: what's already in the CRM */
  byActualFlag: FlagGroupSummary[];
  /** By resolvedFlag where preExistingFlagStatus === "none": what would be assigned if "Assign All" ran now */
  byQueuedFlag: FlagGroupSummary[];

  /** The active perspective's data (driven by summaryFlagPerspective) */
  activePerspective: FlagGroupSummary[];

  /**
   * Group breakdown driven by summaryGroupKey — null if no grouping selected.
   * Includes all customers (exempt + non-exempt). For exempt customers, uses
   * cappedPercent as the hypothetical flag percent to show opportunity cost.
   * This allows groups like "By Season" to show the blended impact including
   * what's being left on the table for exempt customers in that cohort.
   */
  groupSummaries: GroupSummary[] | null;
};

// ---------------------------------------------------------------------------
// Revenue computation helpers
// ---------------------------------------------------------------------------

/**
 * Computes the projected revenue for a single customer using a given flag's
 * increasePercent. Applies roundToNickel per service to match CRM behavior.
 *
 * flagPercent: the increase percent to apply. Pass null for no change (delta = 0).
 */
function computeCustomerRevenue(
  result: CustomerIncreaseResult,
  flagPercent: number | null,
): { currentRevenue: number; projectedRevenue: number } {
  let currentRevenue = 0;
  let projectedRevenue = 0;

  for (const serviceResult of result.serviceResults) {
    const nextPrice = serviceResult.service.nextPrice;
    currentRevenue += nextPrice;

    if (flagPercent !== null) {
      projectedRevenue += roundToNickel(nextPrice * (1 + flagPercent / 100));
    } else {
      projectedRevenue += nextPrice;
    }
  }

  return { currentRevenue, projectedRevenue };
}

function makeSnapshot(currentRevenue: number, projectedRevenue: number): RevenueSnapshot {
  const revenueDelta = projectedRevenue - currentRevenue;
  const revenueDeltaPercent = currentRevenue !== 0 ? (revenueDelta / currentRevenue) * 100 : 0;
  return { currentRevenue, projectedRevenue, revenueDelta, revenueDeltaPercent };
}

// ---------------------------------------------------------------------------
// Flag group builders — non-exempt customers only
// ---------------------------------------------------------------------------

function buildFlagGroups(
  results: CustomerIncreaseResult[],
  flagKeyFn: (result: CustomerIncreaseResult) => {
    label: string;
    flag: IncreaseFlag | null;
    flagPercent: number | null;
  },
): FlagGroupSummary[] {
  const groupMap = new Map<
    string,
    { label: string; flag: IncreaseFlag | null; customerCount: number; currentRevenue: number; projectedRevenue: number }
  >();

  for (const result of results) {
    const { label, flag, flagPercent } = flagKeyFn(result);
    const { currentRevenue, projectedRevenue } = computeCustomerRevenue(result, flagPercent);

    const existing = groupMap.get(label);
    if (existing) {
      existing.customerCount++;
      existing.currentRevenue += currentRevenue;
      existing.projectedRevenue += projectedRevenue;
    } else {
      groupMap.set(label, { label, flag, customerCount: 1, currentRevenue, projectedRevenue });
    }
  }

  return Array.from(groupMap.values()).map(({ label, flag, customerCount, currentRevenue, projectedRevenue }) => ({
    label,
    flag,
    customerCount,
    ...makeSnapshot(currentRevenue, projectedRevenue),
  }));
}

// ---------------------------------------------------------------------------
// Main summary selector
// ---------------------------------------------------------------------------

const selectPriceIncreaseSummary = createSelector(
  [
    customerIncreaseResultsSelect.results,
    priceIncreaseConfigSelect.summaryGroupKey,
    priceIncreaseConfigSelect.summaryFlagPerspective,
  ],
  (results, summaryGroupKey, summaryFlagPerspective): PriceIncreaseSummary => {
    // ---------------------------------------------------------------------------
    // Status counts and grand totals
    // Non-exempt and exempt are accumulated separately to keep totals clean.
    // ---------------------------------------------------------------------------
    let totalCustomers = 0;
    let exemptCount = 0;
    let conflictCount = 0;
    let needsManualAttentionCount = 0;
    let belowAcquisitionCount = 0;
    let overpricedCount = 0;
    let noFlagCount = 0;

    const flagStatusCounts: Record<PreExistingFlagStatus, number> = {
      none: 0,
      matching: 0,
      override: 0,
      conflict: 0,
    };

    let grandCurrentRevenue = 0;
    let grandProjectedRevenue = 0;
    let exemptCurrentRevenue = 0;
    let exemptProjectedRevenue = 0;

    const nonExemptResults: CustomerIncreaseResult[] = [];

    for (const result of results) {
      totalCustomers++;

      if (result.groupable.isExempt) {
        exemptCount++;
        // Opportunity cost: use cappedPercent as the hypothetical increase
        const { currentRevenue, projectedRevenue } = computeCustomerRevenue(
          result,
          result.cappedPercent,
        );
        exemptCurrentRevenue += currentRevenue;
        exemptProjectedRevenue += projectedRevenue;
        continue;
      }

      nonExemptResults.push(result);

      if (result.groupable.preExistingFlagStatus === "conflict") conflictCount++;
      if (result.groupable.needsManualAttention) needsManualAttentionCount++;
      if (result.groupable.isBelowAcquisition) belowAcquisitionCount++;
      if (result.groupable.isOverpriced) overpricedCount++;
      if (!result.effectiveFlag) noFlagCount++;

      flagStatusCounts[result.groupable.preExistingFlagStatus]++;

      // Grand total uses effectiveFlag for revenue projection
      const { currentRevenue, projectedRevenue } = computeCustomerRevenue(
        result,
        result.effectiveFlag?.increasePercent ?? null,
      );
      grandCurrentRevenue += currentRevenue;
      grandProjectedRevenue += projectedRevenue;
    }

    const grand = makeSnapshot(grandCurrentRevenue, grandProjectedRevenue);
    const exemptOpportunity = makeSnapshot(exemptCurrentRevenue, exemptProjectedRevenue);

    // ---------------------------------------------------------------------------
    // By effective flag — non-exempt only
    // ---------------------------------------------------------------------------
    const byEffectiveFlag = buildFlagGroups(nonExemptResults, (result) => {
      const flag = result.effectiveFlag;
      return {
        label: flag?.desc ?? "No Flag",
        flag,
        flagPercent: flag?.increasePercent ?? null,
      };
    });

    // ---------------------------------------------------------------------------
    // By actual flag — non-exempt only
    // ---------------------------------------------------------------------------
    const byActualFlag = buildFlagGroups(nonExemptResults, (result) => {
      const actualFlag = result.preExistingIncreaseFlags[0] ?? null;
      if (result.preExistingIncreaseFlags.length > 1) {
        return { label: "Conflict", flag: null, flagPercent: null };
      }
      return {
        label: actualFlag?.desc ?? "Unassigned",
        flag: actualFlag,
        flagPercent: actualFlag?.increasePercent ?? null,
      };
    });

    // ---------------------------------------------------------------------------
    // By queued flag — non-exempt, preExistingFlagStatus === "none" only
    // ---------------------------------------------------------------------------
    const queuedResults = nonExemptResults.filter(
      (r) => r.groupable.preExistingFlagStatus === "none",
    );
    const byQueuedFlag = buildFlagGroups(queuedResults, (result) => {
      const flag = result.resolvedFlag;
      return {
        label: flag?.desc ?? "No Flag",
        flag,
        flagPercent: flag?.increasePercent ?? null,
      };
    });

    // ---------------------------------------------------------------------------
    // Active perspective
    // ---------------------------------------------------------------------------
    const perspectiveMap: Record<SummaryFlagPerspective, FlagGroupSummary[]> = {
      effective: byEffectiveFlag,
      actual: byActualFlag,
      queued: byQueuedFlag,
    };
    const activePerspective = perspectiveMap[summaryFlagPerspective];

    // ---------------------------------------------------------------------------
    // Group summaries — all customers (exempt + non-exempt)
    // Exempt customers use cappedPercent as the hypothetical flag percent,
    // showing opportunity cost within each group cohort.
    // ---------------------------------------------------------------------------
    let groupSummaries: GroupSummary[] | null = null;

    if (summaryGroupKey) {
      const grouped = groupCustomerIncreaseResults(results, summaryGroupKey);
      groupSummaries = Array.from(grouped.entries()).map(([label, groupResults]) => {
        let groupCurrentRevenue = 0;
        let groupProjectedRevenue = 0;
        let groupCustomerCount = 0;

        for (const result of groupResults) {
          groupCustomerCount++;
          // Exempt: use cappedPercent (opportunity cost)
          // Non-exempt: use effectiveFlag (actual projected increase)
          const flagPercent = result.groupable.isExempt
            ? result.cappedPercent
            : (result.effectiveFlag?.increasePercent ?? null);

          const { currentRevenue, projectedRevenue } = computeCustomerRevenue(result, flagPercent);
          groupCurrentRevenue += currentRevenue;
          groupProjectedRevenue += projectedRevenue;
        }

        return {
          label,
          customerCount: groupCustomerCount,
          ...makeSnapshot(groupCurrentRevenue, groupProjectedRevenue),
        };
      });
    }

    return {
      grand,
      totalCustomers,
      exemptCount,
      conflictCount,
      needsManualAttentionCount,
      belowAcquisitionCount,
      overpricedCount,
      noFlagCount,
      flagStatusCounts,
      exemptOpportunity,
      byEffectiveFlag,
      byActualFlag,
      byQueuedFlag,
      activePerspective,
      groupSummaries,
    };
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const priceIncreaseSummarySelect = {
  summary: selectPriceIncreaseSummary,
};
