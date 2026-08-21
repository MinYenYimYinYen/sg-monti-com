import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

const PRIOR_SEASON_COUNT = 4;

// Read selected zips directly from state to avoid circular dependency with
// customerValueFilterSelect (which imports from this file).
const selectSelectedZips = (state: AppState): string[] | null =>
  state.customerValueFilter.selectedZips;

/**
 * Customers filtered to the current season only.
 *
 * Each customer's programs array is narrowed to programs whose season matches
 * the current season, and each program's services array is narrowed to services
 * in that same season. Customers with no matching programs are excluded.
 *
 * This is the input for all existing customerValue selectors (byZip, byProgram),
 * ensuring they see only current-season data even when the central maps also
 * contain historical data from the multiSeasonProduction context.
 */
const selectCurrentSeasonCustomers = createSelector(
  [centralSelect.customers, globalSettingsSelect.season],
  (customers, season): Customer[] =>
    customers
      .map((customer) => ({
        ...customer,
        programs: customer.programs
          .filter((program) => program.season === season)
          .map((program) => ({
            ...program,
            services: program.services.filter((service) => service.season === season),
          })),
      }))
      .filter((customer) => customer.programs.length > 0),
);

/**
 * Historical customers partitioned by season.
 *
 * Returns a Map<season, Customer[]> covering the prior N seasons. Each entry
 * contains customers who had at least one completed service (status === "S")
 * in that season. Programs and services are filtered to that season only.
 *
 * Individual Program and Service objects are the same references as in the
 * central maps — no data is duplicated, only the containing arrays are filtered.
 */
const selectHistoricalCustomersBySeason = createSelector(
  [centralSelect.customers, globalSettingsSelect.season],
  (customers, currentSeason): Map<number, Customer[]> => {
    const map = new Map<number, Customer[]>();

    for (let offset = PRIOR_SEASON_COUNT; offset >= 1; offset--) {
      const season = currentSeason - offset;

      const seasonCustomers = customers
        .map((customer) => ({
          ...customer,
          programs: customer.programs
            .filter((program) => program.season === season)
            .map((program) => ({
              ...program,
              services: program.services.filter(
                (service) => service.season === season && service.status === "S",
              ),
            }))
            .filter((program) => program.services.length > 0),
        }))
        .filter((customer) => customer.programs.length > 0);

      map.set(season, seasonCustomers);
    }

    return map;
  },
);

/**
 * Ordered list of all seasons represented in the historical map,
 * from oldest to most recent prior season.
 */
const selectHistoricalSeasons = createSelector(
  [globalSettingsSelect.season],
  (currentSeason): number[] => {
    const seasons: number[] = [];
    for (let offset = PRIOR_SEASON_COUNT; offset >= 1; offset--) {
      seasons.push(currentSeason - offset);
    }
    return seasons;
  },
);

/**
 * All seasons in display order: [oldest prior ... most recent prior, current].
 */
const selectAllSeasons = createSelector(
  [selectHistoricalSeasons, globalSettingsSelect.season],
  (historicalSeasons, currentSeason): number[] => [...historicalSeasons, currentSeason],
);

// ---------------------------------------------------------------------------
// Zip-filtered selectors for the Retention tab
//
// The zip code filter (selectedZips) applies to all tabs including Retention.
// null = uninitialized (show all). [] = user selected none (show nothing).
// ---------------------------------------------------------------------------

/**
 * Current season customers filtered by the selected zip codes.
 * Used as the "current" side of retention rate calculations.
 */
const selectFilteredCurrentSeasonCustomers = createSelector(
  [selectCurrentSeasonCustomers, selectSelectedZips],
  (customers, selectedZips): Customer[] => {
    if (selectedZips === null) return customers;
    if (selectedZips.length === 0) return [];
    const zipSet = new Set(selectedZips);
    return customers.filter((c) => zipSet.has(c.address.zip ?? ""));
  },
);

/**
 * Historical customers by season, filtered by the selected zip codes.
 * Used as the "prior" side of retention rate calculations.
 */
const selectFilteredHistoricalCustomersBySeason = createSelector(
  [selectHistoricalCustomersBySeason, selectSelectedZips],
  (historicalBySeason, selectedZips): Map<number, Customer[]> => {
    if (selectedZips === null) return historicalBySeason;
    if (selectedZips.length === 0) {
      // Return an empty map — no zips selected means no data
      const empty = new Map<number, Customer[]>();
      for (const season of historicalBySeason.keys()) {
        empty.set(season, []);
      }
      return empty;
    }
    const zipSet = new Set(selectedZips);
    const filtered = new Map<number, Customer[]>();
    for (const [season, customers] of historicalBySeason) {
      filtered.set(
        season,
        customers.filter((c) => zipSet.has(c.address.zip ?? "")),
      );
    }
    return filtered;
  },
);

export const customerValueSeasonSelect = {
  currentSeasonCustomers: selectCurrentSeasonCustomers,
  historicalCustomersBySeason: selectHistoricalCustomersBySeason,
  historicalSeasons: selectHistoricalSeasons,
  allSeasons: selectAllSeasons,
  filteredCurrentSeasonCustomers: selectFilteredCurrentSeasonCustomers,
  filteredHistoricalCustomersBySeason: selectFilteredHistoricalCustomersBySeason,
};
