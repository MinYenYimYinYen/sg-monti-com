import { createSelector } from "@reduxjs/toolkit";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { priceIncreaseConfigSelect } from "@/app/priceIncrease/config/_lib/priceIncreaseConfigSelect";
import { seasonIncreasesSelect } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import {
  IncreaseDataIssue,
  ServiceIncreaseResult,
} from "@/app/priceIncrease/results/increaseResultsTypes";
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
// Service-level results + data issues
// ---------------------------------------------------------------------------

type ServiceIncreaseOutcomes = {
  serviceIncreaseResultMap: Map<number, ServiceIncreaseResult[]>;
  dataIssues: IncreaseDataIssue[];
};

/**
 * For each matched customer's target program, computes a ServiceIncreaseOutcome
 * per service using makeServiceIncreaseResult.
 *
 * Successful outcomes are collected into serviceIncreaseResultMap (Map<custId, ServiceIncreaseResult[]>).
 * Failed outcomes (missing acqPrice or dateSold) are collected into dataIssues for UI display.
 *
 * Customers with no successful service results are excluded from the map.
 */
const selectServiceIncreaseOutcomes = createSelector(
  [
    selectMatchedCustomers,
    priceIncreaseConfigSelect.settings,
    seasonIncreasesSelect.activeDoc,
    globalSettingsSelect.season,
  ],
  (matchedCustomers, settings, seasonIncreasesDoc, currentSeason): ServiceIncreaseOutcomes => {
    const serviceIncreaseResultMap = new Map<number, ServiceIncreaseResult[]>();
    const dataIssues: IncreaseDataIssue[] = [];

    // DEBUG [PI] — remove when results are confirmed working
    console.log("[PI] settings:", settings ? { progCodeId: settings.progCodeId, ongoingIncrease: settings.ongoingIncrease } : null);
    console.log("[PI] seasonIncreasesDoc:", seasonIncreasesDoc ? { id: seasonIncreasesDoc.seasonIncreasesId, count: seasonIncreasesDoc.seasonIncreases.length } : null);
    console.log("[PI] currentSeason:", currentSeason);
    console.log("[PI] matched customers:", matchedCustomers.length);

    if (!settings || !seasonIncreasesDoc) {
      console.log("[PI] early return — missing settings or seasonIncreasesDoc");
      return { serviceIncreaseResultMap, dataIssues };
    }

    for (const { customer, targetProgram } of matchedCustomers) {
      const serviceResults: ServiceIncreaseResult[] = [];

      console.log(`[PI] customer ${customer.custId}: targetProgram ${targetProgram.progId} services count: ${targetProgram.services.length}`);

      // Guard dateSold at the program level — emit one issue for the whole
      // program rather than one per service.
      if (!targetProgram.dateSold) {
        dataIssues.push({
          custId: customer.custId,
          progId: targetProgram.progId,
          missingField: "dateSold",
          message: `Customer ${customer.custId}, program ${targetProgram.progCode.progCodeId}: sold date is missing.`,
        });
        continue;
      }

      for (const service of targetProgram.services) {
        const outcome = makeServiceIncreaseResult({
          service,
          dateSold: targetProgram.dateSold,
          currentSeason,
          seasonIncreases: seasonIncreasesDoc.seasonIncreases,
          ongoingIncrease: settings.ongoingIncrease,
        });

        console.log(`[PI]   service ${service.servCode.servCodeId} (${service.servId}): ${outcome.ok ? "ok" : `FAIL(${outcome.issue.missingField})`}`);

        if (outcome.ok) {
          serviceResults.push(outcome.result);
        } else {
          dataIssues.push(outcome.issue);
        }
      }

      // Only include customers who have at least one priceable service
      if (serviceResults.length > 0) {
        serviceIncreaseResultMap.set(customer.custId, serviceResults);
      }
    }

    console.log("[PI] final resultMap size:", serviceIncreaseResultMap.size, "dataIssues:", dataIssues.length);

    return { serviceIncreaseResultMap, dataIssues };
  },
);

const selectServiceIncreaseResultMap = createSelector(
  [selectServiceIncreaseOutcomes],
  (outcomes) => outcomes.serviceIncreaseResultMap,
);

const selectServiceIncreaseResultsArray = createSelector(
  [selectServiceIncreaseResultMap],
  (resultMap): ServiceIncreaseResult[] => Array.from(resultMap.values()).flat(),
);

const selectDataIssues = createSelector(
  [selectServiceIncreaseOutcomes],
  (outcomes) => outcomes.dataIssues,
);

/**
 * Map<custId, ServiceIncreaseResult[]> — same as serviceIncreaseResultMap but
 * named to reflect that each entry represents one customer's service results.
 * The customer reference is available on each result via result.customer.
 */
const selectByCustomer = createSelector(
  [selectServiceIncreaseResultMap],
  (resultMap) => resultMap,
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
  byCustomer: selectByCustomer,
  dataIssues: selectDataIssues,
};
