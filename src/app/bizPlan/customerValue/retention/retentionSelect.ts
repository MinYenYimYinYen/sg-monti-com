import { createSelector } from "@reduxjs/toolkit";
import { customerValueSeasonSelect } from "@/app/bizPlan/customerValue/customerValueSeasonSelect";
import {
  computeServiceRetention,
  computeProgramRetention,
  computeCustomerRetention,
  buildServiceChurnRecords,
  buildProgramChurnRecords,
  buildCustomerChurnRecords,
  RetentionRate,
  ChurnRecord,
} from "@/app/bizPlan/customerValue/retention/retentionLogic";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

// ---------------------------------------------------------------------------
// Retention rates — one RetentionRate per consecutive season pair
//
// All selectors use the zip-filtered season data so the retention tab
// respects the same zip code filter as the By Zip Code and By Program tabs.
// ---------------------------------------------------------------------------

/**
 * Computes retention rates for each consecutive season pair at the given level.
 * The last pair always uses filteredCurrentSeasonCustomers as the "to" side.
 */
function computeRetentionRates(
  historicalBySeason: Map<number, Customer[]>,
  currentCustomers: Customer[],
  historicalSeasons: number[],
  computeFn: typeof computeServiceRetention,
): RetentionRate[] {
  const rates: RetentionRate[] = [];

  for (let i = 0; i < historicalSeasons.length; i++) {
    const fromSeason = historicalSeasons[i];
    const toSeason = historicalSeasons[i + 1] ?? (fromSeason + 1);
    const priorCustomers = historicalBySeason.get(fromSeason) ?? [];
    const nextCustomers =
      i + 1 < historicalSeasons.length
        ? (historicalBySeason.get(toSeason) ?? [])
        : currentCustomers;

    rates.push(computeFn(priorCustomers, nextCustomers, fromSeason, toSeason));
  }

  return rates;
}

const selectServiceRetentionRates = createSelector(
  [
    customerValueSeasonSelect.filteredHistoricalCustomersBySeason,
    customerValueSeasonSelect.filteredCurrentSeasonCustomers,
    customerValueSeasonSelect.historicalSeasons,
  ],
  (historicalBySeason, currentCustomers, historicalSeasons): RetentionRate[] =>
    computeRetentionRates(
      historicalBySeason,
      currentCustomers,
      historicalSeasons,
      computeServiceRetention,
    ),
);

const selectProgramRetentionRates = createSelector(
  [
    customerValueSeasonSelect.filteredHistoricalCustomersBySeason,
    customerValueSeasonSelect.filteredCurrentSeasonCustomers,
    customerValueSeasonSelect.historicalSeasons,
  ],
  (historicalBySeason, currentCustomers, historicalSeasons): RetentionRate[] =>
    computeRetentionRates(
      historicalBySeason,
      currentCustomers,
      historicalSeasons,
      computeProgramRetention,
    ),
);

const selectCustomerRetentionRates = createSelector(
  [
    customerValueSeasonSelect.filteredHistoricalCustomersBySeason,
    customerValueSeasonSelect.filteredCurrentSeasonCustomers,
    customerValueSeasonSelect.historicalSeasons,
  ],
  (historicalBySeason, currentCustomers, historicalSeasons): RetentionRate[] =>
    computeRetentionRates(
      historicalBySeason,
      currentCustomers,
      historicalSeasons,
      computeCustomerRetention,
    ),
);

// ---------------------------------------------------------------------------
// Churn records — one ChurnRecord per entity identity across all seasons
// ---------------------------------------------------------------------------

const selectServiceChurnRecords = createSelector(
  [
    customerValueSeasonSelect.filteredHistoricalCustomersBySeason,
    customerValueSeasonSelect.filteredCurrentSeasonCustomers,
    customerValueSeasonSelect.historicalSeasons,
  ],
  (historicalBySeason, currentCustomers, historicalSeasons): ChurnRecord[] =>
    buildServiceChurnRecords(historicalBySeason, currentCustomers, historicalSeasons),
);

const selectProgramChurnRecords = createSelector(
  [
    customerValueSeasonSelect.filteredHistoricalCustomersBySeason,
    customerValueSeasonSelect.filteredCurrentSeasonCustomers,
    customerValueSeasonSelect.historicalSeasons,
  ],
  (historicalBySeason, currentCustomers, historicalSeasons): ChurnRecord[] =>
    buildProgramChurnRecords(historicalBySeason, currentCustomers, historicalSeasons),
);

const selectCustomerChurnRecords = createSelector(
  [
    customerValueSeasonSelect.filteredHistoricalCustomersBySeason,
    customerValueSeasonSelect.filteredCurrentSeasonCustomers,
    customerValueSeasonSelect.historicalSeasons,
  ],
  (historicalBySeason, currentCustomers, historicalSeasons): ChurnRecord[] =>
    buildCustomerChurnRecords(historicalBySeason, currentCustomers, historicalSeasons),
);

export const retentionSelect = {
  serviceRetentionRates: selectServiceRetentionRates,
  programRetentionRates: selectProgramRetentionRates,
  customerRetentionRates: selectCustomerRetentionRates,
  serviceChurnRecords: selectServiceChurnRecords,
  programChurnRecords: selectProgramChurnRecords,
  customerChurnRecords: selectCustomerChurnRecords,
};
