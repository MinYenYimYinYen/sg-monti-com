# Phase 3 — priceIncreaseSelect

**Goal:** Implement `priceIncreaseSelect.ts` — the standalone selector that hydrates `IncreaseFlag[]` and computes `Map<custId, PriceIncreaseResult>` from all upstream data.

**Prerequisite:** Phases 1, 2A, and 2B complete. All reducers registered. `AppState` includes `seasonIncreases` and `priceIncreaseSettings`.

---

## Required Reading (this phase only)

- `src/app/priceIncrease/priceIncreasePlan.md` — full module spec
- `src/app/priceIncrease/_lib/PriceIncreaseTypes.ts` — all types
- `src/app/priceIncrease/_lib/priceIncreaseFuncs.ts` — all math functions
- `src/app/priceIncrease/seasonIncreases/seasonIncreasesSelect.ts` — `activeDoc`
- `src/app/priceIncrease/settings/settingsSelect.ts` — `activeDoc`
- `src/app/realGreen/customer/selectors/centralSelectors.ts` — `centralSelect.customers`
- `src/app/globalSettings/_lib/globalSettingsSelect.ts` — `increaseFlagMappings`, `season`
- `src/app/realGreen/flag/_selectors/flagSelect.ts` — `flagDocMap`

---

## Implementation

**File:** `src/app/priceIncrease/priceIncreaseSelect.ts`

```typescript
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
      // (maxEver cap will still apply relative to 0, effectively capping at maxEver total)
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

const selectWithUpsellBonus = createSelector([selectResultsArray], (results) =>
  results.filter((r) => !r.isExempt && r.serviceBreakdown.some((s) => s.plannedPercent < s.plannedPercent)),
);

const selectSortedByIncrease = createSelector([selectResultsArray], (results) =>
  [...results].sort((a, b) => b.cappedPercent - a.cappedPercent),
);

// Total revenue delta from flag rounding (resolved flag percent vs calculated percent)
// Positive = more revenue than calculated, Negative = less
const selectFlagResolutionError = createSelector(
  [selectResultsArray],
  (results): number => {
    return results.reduce((total, result) => {
      if (!result.resolvedFlag || result.isExempt) return total;
      const diff = result.resolvedFlag.increasePercent - result.cappedPercent;
      // Sum the revenue impact across all services in the breakdown
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
```

---

## Notes

**`cumulativeIncreaseToDate`:** The plan specifies this as an input to `applyIncreaseCaps`, but there is no native storage for it yet. The selector uses `0` as a placeholder, which means `maxEver` acts as an absolute cap from the baseline. When native tracking is added in a future phase, update this selector to read from that source.

**`withUpsellBonus`:** The filter condition in the stub above is a placeholder — the correct logic is: a result has an upsell bonus if `otherProgramCount > upsellBonusThreshold`. Since `otherProgramCount` is not stored on `PriceIncreaseResult`, either add it to the result type or compute it inline. Revisit this selector when building the By Customer view.

---

## Verification

Run `ide_diagnostics` on:
- `src/app/priceIncrease/priceIncreaseSelect.ts`

Confirm no type errors before proceeding to Phase 4.
