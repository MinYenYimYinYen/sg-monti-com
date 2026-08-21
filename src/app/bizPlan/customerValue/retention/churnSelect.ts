import { createSelector } from "@reduxjs/toolkit";
import { retentionSelect } from "@/app/bizPlan/customerValue/retention/retentionSelect";
import { customerValueSeasonSelect } from "@/app/bizPlan/customerValue/customerValueSeasonSelect";
import {
  buildChurnDistribution,
  computeReturnRate,
  getChurnedForExactly,
  getReturnedAfterAtLeast,
  ChurnDistributionRow,
  ChurnRecord,
} from "@/app/bizPlan/customerValue/retention/retentionLogic";

// ---------------------------------------------------------------------------
// Churn distribution tables
//
// Each selector returns a ChurnDistributionRow[] showing how many entities
// were absent for N seasons before returning. The number of rows is derived
// from the total number of seasons loaded (historical + current), so the
// table never shows rows that are mathematically impossible to populate.
// ---------------------------------------------------------------------------

const selectServiceChurnDistribution = createSelector(
  [retentionSelect.serviceChurnRecords, customerValueSeasonSelect.allSeasons],
  (records, allSeasons): ChurnDistributionRow[] =>
    buildChurnDistribution(records, allSeasons.length),
);

const selectProgramChurnDistribution = createSelector(
  [retentionSelect.programChurnRecords, customerValueSeasonSelect.allSeasons],
  (records, allSeasons): ChurnDistributionRow[] =>
    buildChurnDistribution(records, allSeasons.length),
);

const selectCustomerChurnDistribution = createSelector(
  [retentionSelect.customerChurnRecords, customerValueSeasonSelect.allSeasons],
  (records, allSeasons): ChurnDistributionRow[] =>
    buildChurnDistribution(records, allSeasons.length),
);

// ---------------------------------------------------------------------------
// Narrative stats
//
// The headline number for the business valuation story:
// "X% of customers who cancel return within 2 seasons."
// ---------------------------------------------------------------------------

const selectCustomerReturnRateWithin2 = createSelector(
  [retentionSelect.customerChurnRecords],
  (records): number => computeReturnRate(records, 2),
);

const selectServiceReturnRateWithin2 = createSelector(
  [retentionSelect.serviceChurnRecords],
  (records): number => computeReturnRate(records, 2),
);

const selectProgramReturnRateWithin2 = createSelector(
  [retentionSelect.programChurnRecords],
  (records): number => computeReturnRate(records, 2),
);

// ---------------------------------------------------------------------------
// Filtered churn record sets
//
// Pre-filtered views used by the drill-down sheet and churn analysis table.
// ---------------------------------------------------------------------------

/** Customers that churned and returned after exactly 1 season away. */
const selectCustomersChurnedFor1Season = createSelector(
  [retentionSelect.customerChurnRecords],
  (records): ChurnRecord[] => getChurnedForExactly(records, 1),
);

/** Customers that churned and returned after exactly 2 seasons away. */
const selectCustomersChurnedFor2Seasons = createSelector(
  [retentionSelect.customerChurnRecords],
  (records): ChurnRecord[] => getChurnedForExactly(records, 2),
);

/** Customers that returned after being away for at least 1 season. */
const selectCustomersWhoReturned = createSelector(
  [retentionSelect.customerChurnRecords],
  (records): ChurnRecord[] => getReturnedAfterAtLeast(records, 1),
);

export const churnSelect = {
  serviceChurnDistribution: selectServiceChurnDistribution,
  programChurnDistribution: selectProgramChurnDistribution,
  customerChurnDistribution: selectCustomerChurnDistribution,
  customerReturnRateWithin2: selectCustomerReturnRateWithin2,
  serviceReturnRateWithin2: selectServiceReturnRateWithin2,
  programReturnRateWithin2: selectProgramReturnRateWithin2,
  customersChurnedFor1Season: selectCustomersChurnedFor1Season,
  customersChurnedFor2Seasons: selectCustomersChurnedFor2Seasons,
  customersWhoReturned: selectCustomersWhoReturned,
};
