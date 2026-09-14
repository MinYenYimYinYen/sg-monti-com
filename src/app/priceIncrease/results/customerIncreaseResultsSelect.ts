import { createSelector } from "@reduxjs/toolkit";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { serviceIncreaseResultsSelect } from "@/app/priceIncrease/results/serviceIncreaseResultsSelect";
import { IncreaseFlag } from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import {
  calcSeasonCount,
  calcUpsellAdjustment,
  applyIncreaseCaps,
  resolveIncreaseFlag,
} from "@/app/priceIncrease/_lib/priceIncreaseFuncs";
import {
  CustomerIncreaseResult,
  GroupableIncreaseProperties,
  PreExistingFlagStatus,
  SortableIncreaseProperties,
} from "@/app/priceIncrease/results/customerIncreaseResultsTypes";

// ---------------------------------------------------------------------------
// Hydrated IncreaseFlag list
// ---------------------------------------------------------------------------

const selectIncreaseFlags = createSelector(
  [globalSettingsSelect.increaseFlagMappings, flagSelect.flagDocMap],
  (mappings, flagDocMap): IncreaseFlag[] =>
    mappings.flatMap((mapping) => {
      const flag = flagDocMap.get(mapping.flagId);
      if (!flag) return [];
      return [{ ...mapping, ...flag }];
    }),
);

// ---------------------------------------------------------------------------
// Main aggregation selector
// ---------------------------------------------------------------------------

/**
 * Aggregates each matched customer's ServiceIncreaseResult[] into a single
 * CustomerIncreaseResult. Applies upsell bonus and caps after aggregation.
 *
 * Pipeline per customer:
 *   1. rawPercent    — size-weighted average of planDiffPercent across services
 *   2. calculatedPercent — after upsell bonus
 *   3. cappedPercent — after maxIncreaseNow / maxIncreaseEver caps
 *   4. resolvedFlag  — resolved against cappedPercent
 *
 * Exempt customers are included with zeroed percents and isExempt: true.
 * Unmatched customers (no target program) are excluded — they live in
 * serviceIncreaseResultsSelect.unmatchedCustomers.
 */
const selectCustomerIncreaseResults = createSelector(
  [
    serviceIncreaseResultsSelect.matchedCustomers,
    serviceIncreaseResultsSelect.byCustomer,
    priceIncreaseConfigSelect.settings,
    priceIncreaseConfigSelect.targetSeason,
    selectIncreaseFlags,
    globalSettingsSelect.priceIncreaseExemptFlagId,
    globalSettingsSelect.priceIncreaseManualFlagId,
  ],
  (
    matchedCustomers,
    serviceResultMap,
    settings,
    currentSeason,
    increaseFlags,
    exemptFlagId,
    manualFlagId,
  ): CustomerIncreaseResult[] => {
    if (!settings) return [];

    const increaseFlagIds = new Set(increaseFlags.map((f) => f.flagId));
    const results: CustomerIncreaseResult[] = [];

    for (const { customer, targetProgram } of matchedCustomers) {
      const isExempt =
        exemptFlagId !== null &&
        customer.flags.some((f) => f.flagId === exemptFlagId);

      const isManual =
        manualFlagId !== null &&
        customer.flags.some((f) => f.flagId === manualFlagId);

      const hasIncreaseFlag = customer.flags.some((f) => increaseFlagIds.has(f.flagId));

      const seasonCount = targetProgram.dateSold
        ? calcSeasonCount({ dateSold: targetProgram.dateSold, currentSeason })
        : 0;

      const customerRevenue = customer.x.revenue("renewal");
      const programRevenue = targetProgram.x.revenue("renewal");

      // Pre-existing increase flags — recognized increase flags already on the customer
      const preExistingIncreaseFlags = customer.flags.flatMap((f) => {
        const inc = increaseFlags.find((inc) => inc.flagId === f.flagId);
        return inc ? [inc] : [];
      });

      if (isExempt) {
        const sortable: SortableIncreaseProperties = {
          increaseDollar: 0,
          increasePercent: 0,
          rawPercent: 0,
          customerRevenue,
          programRevenue,
          seasonCount,
        };
        const groupable: GroupableIncreaseProperties = {
          isExempt: true,
          isManual,
          needsManualAttention: false,
          hasIncreaseFlag,
          isOverpriced: false,
          isBelowAcquisition: false,
          resolvedFlagDesc: "No Flag",
          preExistingFlagStatus: preExistingIncreaseFlags.length === 0 ? "none"
            : preExistingIncreaseFlags.length > 1 ? "conflict"
            : "matching", // exempt customers have no resolvedFlag to compare against
        };
        results.push({
          customer,
          targetProgram,
          serviceResults: [],
          rawPercent: 0,
          calculatedPercent: 0,
          cappedPercent: 0,
          resolvedFlag: null,
          preExistingIncreaseFlags,
          effectiveFlag: null,
          sortable,
          groupable,
        });
        continue;
      }

      const serviceResults = serviceResultMap.get(customer.custId) ?? [];

      // No priceable services — skip (data issue already captured in dataIssues)
      if (serviceResults.length === 0) continue;

      // ---------------------------------------------------------------------------
      // Step 1: rawPercent — size-weighted average of planDiffPercent
      // ---------------------------------------------------------------------------
      const totalSize = serviceResults.reduce((sum, r) => sum + r.service.nextSize, 0);
      const rawPercent =
        totalSize === 0
          ? 0
          : serviceResults.reduce((sum, r) => sum + r.service.nextSize * r.planDiffPercent, 0) /
            totalSize;

      // ---------------------------------------------------------------------------
      // Step 2: calculatedPercent — after upsell bonus
      // ---------------------------------------------------------------------------
      const otherProgramCount = customer.programs.filter(
        (p) => p.progId !== targetProgram.progId && p.status === "9",
      ).length;

      const calculatedPercent = calcUpsellAdjustment({
        plannedPercent: rawPercent,
        otherProgramCount,
        threshold: settings.upsellBonusThreshold,
        bonusPercent: settings.upsellBonusPercent,
        minPercent: settings.minPriceIncrease,
      });

      // ---------------------------------------------------------------------------
      // Step 3: cappedPercent — after maxIncreaseNow / maxIncreaseEver caps
      // ---------------------------------------------------------------------------
      const cappedPercent = applyIncreaseCaps({
        percent: calculatedPercent,
        maxNow: settings.maxIncreaseNow,
        maxEver: settings.maxIncreaseEver,
        cumulativeIncreaseToDate: 0, // not yet tracked natively
      });

      // ---------------------------------------------------------------------------
      // Step 4: resolvedFlag — resolved against calculatedPercent (post-bonus,
      // pre-cap). The flag represents the increase the customer will actually
      // receive after the upsell bonus is applied; rounding picks the nearest
      // flag to that adjusted value.
      // ---------------------------------------------------------------------------
      const resolvedFlag = resolveIncreaseFlag({
        calculatedPercent,
        increaseFlags,
        rounding: settings.flagRounding,
      });

      // ---------------------------------------------------------------------------
      // Effective flag — pre-existing flag overrides resolvedFlag when present
      // ---------------------------------------------------------------------------
      const effectiveFlag: IncreaseFlag | null =
        preExistingIncreaseFlags.length === 0
          ? resolvedFlag                          // normal: use module's resolved flag
          : preExistingIncreaseFlags.length === 1
            ? preExistingIncreaseFlags[0]         // override or matching: pre-existing wins
            : null;                               // conflict: unresolvable, no effective flag

      const preExistingFlagStatus: PreExistingFlagStatus =
        preExistingIncreaseFlags.length === 0 ? "none"
        : preExistingIncreaseFlags.length > 1 ? "conflict"
        : preExistingIncreaseFlags[0].flagId === resolvedFlag?.flagId ? "matching"
        : "override";

      // ---------------------------------------------------------------------------
      // Pre-computed sortable / groupable properties
      // ---------------------------------------------------------------------------
      const increaseDollar = serviceResults.reduce((sum, r) => sum + r.planDiff, 0);
      const isBelowAcquisition = serviceResults.some((r) => r.service.nextPrice < r.acqPrice);
      // isOverpriced uses rawPercent (pre-bonus, pre-cap) — the true signal that
      // current prices already exceed the plan price, independent of adjustments.
      const isOverpriced = rawPercent < 0;
      const needsManualAttention =
        rawPercent > settings.maxIncreaseNow + settings.manualAttentionThreshold;

      const sortable: SortableIncreaseProperties = {
        increaseDollar,
        // Use effectiveFlag percent when available — reflects the actual outcome
        increasePercent: effectiveFlag?.increasePercent ?? cappedPercent,
        rawPercent,
        customerRevenue,
        programRevenue,
        seasonCount,
      };

      const groupable: GroupableIncreaseProperties = {
        isExempt: false,
        isManual,
        needsManualAttention,
        hasIncreaseFlag,
        isOverpriced,
        isBelowAcquisition,
        resolvedFlagDesc: effectiveFlag?.desc ?? "No Flag",
        preExistingFlagStatus,
      };

      results.push({
        customer,
        targetProgram,
        serviceResults,
        rawPercent,
        calculatedPercent,
        cappedPercent,
        resolvedFlag,
        preExistingIncreaseFlags,
        effectiveFlag,
        sortable,
        groupable,
      } satisfies CustomerIncreaseResult);
    }

    return results;
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const customerIncreaseResultsSelect = {
  results: selectCustomerIncreaseResults,
};
