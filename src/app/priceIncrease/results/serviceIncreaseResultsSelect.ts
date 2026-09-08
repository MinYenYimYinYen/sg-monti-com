import { createSelector } from "@reduxjs/toolkit";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { ServiceIncreaseResult } from "@/app/priceIncrease/results/increaseResultsTypes";
import { makeServiceIncreaseResult } from "@/app/priceIncrease/results/makeServiceIncreaseResult";

// ---------------------------------------------------------------------------
// Customer bucketing
// ---------------------------------------------------------------------------

type BucketedCustomers = {
  matched: Array<{ customer: Customer; targetProgram: Program }>;
  unmatched: Customer[];
};

/**
 * Splits customers into matched/unmatched buckets based on whether they have
 * a program whose progCodeId matches settings.progCodeId.
 *
 * Only matched customers participate in price increase calculations.
 */
const selectBucketedCustomers = createSelector(
  [centralSelect.customers, priceIncreaseConfigSelect.settings],
  (customers, settings): BucketedCustomers => {
    const matched: BucketedCustomers["matched"] = [];
    const unmatched: Customer[] = [];

    if (!settings) {
      return { matched, unmatched: customers };
    }

    for (const customer of customers) {
      const targetProgram = customer.programs.find(
        (program) => program.progCode.progCodeId === settings.progCodeId,
      );

      if (targetProgram) {
        matched.push({ customer, targetProgram });
      } else {
        unmatched.push(customer);
      }
    }

    return { matched, unmatched };
  },
);

const selectMatchedCustomers = createSelector(
  [selectBucketedCustomers],
  (buckets) => buckets.matched,
);

const selectUnmatchedCustomers = createSelector(
  [selectBucketedCustomers],
  (buckets) => buckets.unmatched,
);

// ---------------------------------------------------------------------------
// Service-level results
// ---------------------------------------------------------------------------

/**
 * For each matched customer's target program, computes a ServiceIncreaseResult
 * for every service that has a valid acquisition price.
 *
 * Returns a Map<custId, ServiceIncreaseResult[]> for efficient downstream lookup.
 * Services without an acquisition price (no price table) are excluded.
 */
const selectServiceIncreaseResultMap = createSelector(
  [
    selectMatchedCustomers,
    priceIncreaseConfigSelect.settings,
    seasonIncreasesSelect.activeDoc,
    globalSettingsSelect.season,
  ],
  (matchedCustomers, settings, seasonIncreasesDoc, currentSeason): Map<number, ServiceIncreaseResult[]> => {
    const resultMap = new Map<number, ServiceIncreaseResult[]>();

    if (!settings || !seasonIncreasesDoc) return resultMap;

    for (const { customer, targetProgram } of matchedCustomers) {
      const serviceResults: ServiceIncreaseResult[] = [];
      for (const service of targetProgram.services) {
        const result = makeServiceIncreaseResult({
          service,
          dateSold: targetProgram.dateSold,
          currentSeason,
          seasonIncreases: seasonIncreasesDoc.seasonIncreases,
          ongoingIncrease: settings.ongoingIncrease,
        });
        if (result !== null) serviceResults.push(result);
      }

      // Only include customers who have at least one priceable service
      if (serviceResults.length > 0) {
        resultMap.set(customer.custId, serviceResults);
      }
    }

    return resultMap;
  },
);

const selectServiceIncreaseResultsArray = createSelector(
  [selectServiceIncreaseResultMap],
  (resultMap): ServiceIncreaseResult[] => Array.from(resultMap.values()).flat(),
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const serviceIncreaseResultsSelect = {
  bucketedCustomers: selectBucketedCustomers,
  matchedCustomers: selectMatchedCustomers,
  unmatchedCustomers: selectUnmatchedCustomers,
  serviceIncreaseResultMap: selectServiceIncreaseResultMap,
  serviceIncreaseResultsArray: selectServiceIncreaseResultsArray,
};
