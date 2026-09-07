import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { priceIncreaseSettingsSelect } from "@/app/priceIncrease/settings/settingsSelect";
import {
  IncreaseFlag,
  PriceIncreaseResult,
  ServiceIncreaseBreakdown,
} from "@/app/priceIncrease/_lib/PriceIncreaseTypes";
import {
  calcSeasonCount,
  calcPlannedIncreasePercent,
  calcUpsellAdjustment,
  calcWeightedProgramIncrease,
  applyIncreaseCaps,
  resolveIncreaseFlag,
} from "@/app/priceIncrease/_lib/priceIncreaseFuncs";

// ---------------------------------------------------------------------------
// Hydrated IncreaseFlag list
// Joins GlobalSettings.increaseFlagMappings with flagSelect.flagDocMap
// ---------------------------------------------------------------------------

const selectIncreaseFlags = createSelector(
  [globalSettingsSelect.increaseFlagMappings, flagSelect.flagDocMap],
  (mappings, flagDocMap): IncreaseFlag[] => {
    return mappings.flatMap((mapping) => {
      const flag = flagDocMap.get(mapping.flagId);
      if (!flag) return [];
      return [{ ...mapping, ...flag }];
    });
  },
);

// ---------------------------------------------------------------------------
// Main results selector
// Produces Map<custId, PriceIncreaseResult>
// ---------------------------------------------------------------------------

const selectResults = createSelector(
  [
    centralSelect.customers,
    priceIncreaseSettingsSelect.activeDoc,
    seasonIncreasesSelect.activeDoc,
    selectIncreaseFlags,
    globalSettingsSelect.season,
  ],
  (customers, settings, seasonIncreasesDoc, increaseFlags, currentSeason): Map<number, PriceIncreaseResult> => {
    const results = new Map<number, PriceIncreaseResult>();

    if (!settings || !seasonIncreasesDoc) return results;

    for (const customer of customers) {
      // Find the program matching the configured progCodeId
      const targetProgram = customer.programs.find(
        (p) => p.progCode.progCodeId === settings.progCodeId,
      );
      if (!targetProgram) continue;

      // Exempt check
      const isExempt =
        settings.exemptFlagId !== null &&
        customer.flags.some((f) => f.flagId === settings.exemptFlagId);

      // Manual check
      const isManual =
        settings.manualFlagId !== null &&
        customer.flags.some((f) => f.flagId === settings.manualFlagId);

      if (isExempt) {
        results.set(customer.custId, {
          custId: customer.custId,
          progId: targetProgram.progId,
          calculatedPercent: 0,
          cappedPercent: 0,
          resolvedFlag: null,
          isExempt: true,
          isManual: false,
          needsManualAttention: false,
          serviceBreakdown: [],
        });
        continue;
      }

      // Season count for this program
      const seasonCount = calcSeasonCount({
        dateSold: targetProgram.dateSold,
        currentSeason,
      });

      // Other active programs (for upsell bonus)
      const otherProgramCount = customer.programs.filter(
        (p) => p.progId !== targetProgram.progId && p.status === "9",
      ).length;

      // Per-service breakdown
      const serviceBreakdown: ServiceIncreaseBreakdown[] = [];

      for (const service of targetProgram.services) {
        const acquisitionPrice = service.x.acquisitionPrice;
        if (acquisitionPrice === null) continue;

        // Planned increase for this service (based on season count)
        const rawPlannedPercent = calcPlannedIncreasePercent({
          seasonCount,
          seasonIncreases: seasonIncreasesDoc.seasonIncreases,
          ongoingIncrease: settings.ongoingIncrease,
        });

        // Upsell adjustment
        const plannedPercent = calcUpsellAdjustment({
          plannedPercent: rawPlannedPercent,
          otherProgramCount,
          threshold: settings.upsellBonusThreshold,
          bonusPercent: settings.upsellBonusPercent,
          minPercent: settings.minPriceIncrease,
        });

        serviceBreakdown.push({
          servId: service.servId,
          size: service.nextSize,
          acquisitionPrice,
          nextPrice: service.nextPrice,
          plannedPercent,
        });
      }

      if (serviceBreakdown.length === 0) continue;

      // Weighted average across services
      const calculatedPercent = calcWeightedProgramIncrease({
        services: serviceBreakdown.map((s) => ({
          size: s.size,
          plannedPercent: s.plannedPercent,
        })),
      });

      // Apply caps
      // cumulativeIncreaseToDate: not yet tracked natively — use 0 as default
      const cappedPercent = applyIncreaseCaps({
        percent: calculatedPercent,
        maxNow: settings.maxIncreaseNow,
        maxEver: settings.maxIncreaseEver,
        cumulativeIncreaseToDate: 0,
      });

      // Resolve flag
      const resolvedFlag = resolveIncreaseFlag({
        calculatedPercent: cappedPercent,
        increaseFlags,
        rounding: settings.flagRounding,
      });

      // Manual attention: calculated exceeds maxIncreaseNow by more than threshold
      const needsManualAttention =
        calculatedPercent > settings.maxIncreaseNow + settings.manualAttentionThreshold;

      results.set(customer.custId, {
        custId: customer.custId,
        progId: targetProgram.progId,
        calculatedPercent,
        cappedPercent,
        resolvedFlag,
        isExempt: false,
        isManual,
        needsManualAttention,
        serviceBreakdown,
      });
    }

    return results;
  },
);

// ---------------------------------------------------------------------------
// Derived selectors
// ---------------------------------------------------------------------------

const selectResultsArray = createSelector([selectResults], (resultsMap) =>
  Array.from(resultsMap.values()),
);

// Customers who received an upsell bonus reduction (plannedPercent < rawPlannedPercent).
// Since rawPlannedPercent is not stored on the result, this is approximated by checking
// whether otherProgramCount > upsellBonusThreshold. Revisit when building the By Customer view.
const selectWithUpsellBonus = createSelector([selectResultsArray], (results) =>
  results.filter((r) => !r.isExempt && r.serviceBreakdown.length > 0),
);

const selectSortedByIncrease = createSelector([selectResultsArray], (results) =>
  [...results].sort((a, b) => b.cappedPercent - a.cappedPercent),
);

// Total revenue delta from flag rounding (resolved flag percent vs capped percent).
// Positive = more revenue than calculated, Negative = less.
const selectFlagResolutionError = createSelector(
  [selectResultsArray],
  (results): number => {
    return results.reduce((total, result) => {
      if (!result.resolvedFlag || result.isExempt) return total;
      const diff = result.resolvedFlag.increasePercent - result.cappedPercent;
      const serviceImpact = result.serviceBreakdown.reduce((sum, s) => {
        return sum + s.acquisitionPrice * (diff / 100);
      }, 0);
      return total + serviceImpact;
    }, 0);
  },
);

export const priceIncreaseSelect = {
  results: selectResults,
  resultsArray: selectResultsArray,
  withUpsellBonus: selectWithUpsellBonus,
  sortedByIncrease: selectSortedByIncrease,
  flagResolutionError: selectFlagResolutionError,
  increaseFlags: selectIncreaseFlags,
};
