import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RetentionRate = {
  fromSeason: number;
  toSeason: number;
  priorCount: number;
  retainedCount: number;
  /** retainedCount / priorCount */
  rate: number;
  priorRevenue: number;
  retainedRevenue: number;
  /** retainedRevenue / priorRevenue */
  revenueRate: number;
};

export type ChurnRecord = {
  /** custId, progId, or servId depending on the analysis level */
  id: number;
  activeSeasons: number[];
  cancelledSeasons: number[];
  /** Revenue produced in each active season */
  revenueByActiveSeason: Map<number, number>;
};

// ---------------------------------------------------------------------------
// Identity helpers
//
// An "identity" is the string key that uniquely identifies an entity across
// seasons. Retention is determined by whether the same identity appears in
// consecutive seasons.
// ---------------------------------------------------------------------------

/** Service identity: same customer + same service code = same service line. */
function serviceIdentity(custId: number, servCodeId: string): string {
  return `${custId}:${servCodeId}`;
}

/** Program identity: same customer + same program code = same program type. */
function programIdentity(custId: number, progCodeId: string): string {
  return `${custId}:${progCodeId}`;
}

/** Customer identity: the customer ID itself. */
function customerIdentity(custId: number): string {
  return String(custId);
}

// ---------------------------------------------------------------------------
// Revenue helpers
// ---------------------------------------------------------------------------

function serviceRevenue(service: Customer["programs"][number]["services"][number]): number {
  return service.x.getPriceAfterDiscounts("price");
}

function customerRevenue(customer: Customer): number {
  return customer.programs
    .flatMap((program) => program.services)
    .reduce((sum, service) => sum + serviceRevenue(service), 0);
}

// ---------------------------------------------------------------------------
// Identity set builders
//
// Each builder returns a Map<identity, revenue> for a given season's customers.
// ---------------------------------------------------------------------------

function buildServiceIdentityMap(customers: Customer[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const customer of customers) {
    for (const program of customer.programs) {
      for (const service of program.services) {
        if (service.price <= 0) continue;
        const key = serviceIdentity(customer.custId, service.servCodeId);
        map.set(key, (map.get(key) ?? 0) + serviceRevenue(service));
      }
    }
  }
  return map;
}

function buildProgramIdentityMap(customers: Customer[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const customer of customers) {
    for (const program of customer.programs) {
      const revenue = program.services
        .filter((s) => s.price > 0)
        .reduce((sum, s) => sum + serviceRevenue(s), 0);
      if (revenue <= 0) continue;
      const key = programIdentity(customer.custId, program.progCode.progCodeId);
      map.set(key, (map.get(key) ?? 0) + revenue);
    }
  }
  return map;
}

function buildCustomerIdentityMap(customers: Customer[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const customer of customers) {
    const revenue = customerRevenue(customer);
    if (revenue <= 0) continue;
    const key = customerIdentity(customer.custId);
    map.set(key, (map.get(key) ?? 0) + revenue);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Retention computation
//
// Compares two seasons' identity maps and returns a RetentionRate.
// "Retained" means the identity appears in both the prior and current season.
// ---------------------------------------------------------------------------

function computeRetentionFromMaps(
  priorMap: Map<string, number>,
  currentMap: Map<string, number>,
  fromSeason: number,
  toSeason: number,
): RetentionRate {
  let retainedCount = 0;
  let priorRevenue = 0;
  let retainedRevenue = 0;

  for (const [identity, revenue] of priorMap) {
    priorRevenue += revenue;
    if (currentMap.has(identity)) {
      retainedCount++;
      retainedRevenue += revenue;
    }
  }

  const priorCount = priorMap.size;

  return {
    fromSeason,
    toSeason,
    priorCount,
    retainedCount,
    rate: priorCount > 0 ? retainedCount / priorCount : 0,
    priorRevenue,
    retainedRevenue,
    revenueRate: priorRevenue > 0 ? retainedRevenue / priorRevenue : 0,
  };
}

// ---------------------------------------------------------------------------
// Public retention functions
// ---------------------------------------------------------------------------

/**
 * Computes service-level retention between two consecutive seasons.
 * A service is retained if the same (custId, servCodeId) pair appears in both.
 */
export function computeServiceRetention(
  priorCustomers: Customer[],
  currentCustomers: Customer[],
  fromSeason: number,
  toSeason: number,
): RetentionRate {
  return computeRetentionFromMaps(
    buildServiceIdentityMap(priorCustomers),
    buildServiceIdentityMap(currentCustomers),
    fromSeason,
    toSeason,
  );
}

/**
 * Computes program-level retention between two consecutive seasons.
 * A program is retained if the same (custId, progCodeId) pair appears in both.
 */
export function computeProgramRetention(
  priorCustomers: Customer[],
  currentCustomers: Customer[],
  fromSeason: number,
  toSeason: number,
): RetentionRate {
  return computeRetentionFromMaps(
    buildProgramIdentityMap(priorCustomers),
    buildProgramIdentityMap(currentCustomers),
    fromSeason,
    toSeason,
  );
}

/**
 * Computes customer-level retention between two consecutive seasons.
 * A customer is retained if the same custId appears in both seasons.
 */
export function computeCustomerRetention(
  priorCustomers: Customer[],
  currentCustomers: Customer[],
  fromSeason: number,
  toSeason: number,
): RetentionRate {
  return computeRetentionFromMaps(
    buildCustomerIdentityMap(priorCustomers),
    buildCustomerIdentityMap(currentCustomers),
    fromSeason,
    toSeason,
  );
}

// ---------------------------------------------------------------------------
// Churn detection
//
// An entity is "churned" if it was active in season N, absent in one or more
// consecutive seasons, and then active again in a later season.
//
// The ChurnRecord captures the full timeline so callers can query any pattern.
// ---------------------------------------------------------------------------

type IdentityMapBuilder = (customers: Customer[]) => Map<string, number>;

function buildChurnRecordsFromMaps(
  identityMapBySeason: Map<number, Map<string, number>>,
  seasons: number[],
): ChurnRecord[] {
  // Collect all identities that appear in at least one season
  const allIdentities = new Set<string>();
  for (const map of identityMapBySeason.values()) {
    for (const key of map.keys()) {
      allIdentities.add(key);
    }
  }

  const records: ChurnRecord[] = [];

  for (const identity of allIdentities) {
    const activeSeasons: number[] = [];
    const cancelledSeasons: number[] = [];
    const revenueByActiveSeason = new Map<number, number>();

    for (const season of seasons) {
      const map = identityMapBySeason.get(season);
      if (map?.has(identity)) {
        activeSeasons.push(season);
        revenueByActiveSeason.set(season, map.get(identity) ?? 0);
      } else {
        cancelledSeasons.push(season);
      }
    }

    // Only include entities that were active in at least one season and absent
    // in at least one season — these are the candidates for churn analysis.
    if (activeSeasons.length > 0 && cancelledSeasons.length > 0) {
      // Parse the numeric ID from the identity key (first segment before ":")
      const idStr = identity.split(":")[0];
      const id = parseInt(idStr, 10);
      records.push({ id, activeSeasons, cancelledSeasons, revenueByActiveSeason });
    }
  }

  return records;
}

/**
 * Builds churn records at the service level across all provided seasons.
 * Includes the current season's customers as the final season.
 */
export function buildServiceChurnRecords(
  historicalBySeason: Map<number, Customer[]>,
  currentCustomers: Customer[],
  seasons: number[],
): ChurnRecord[] {
  const identityMapBySeason = new Map<number, Map<string, number>>();
  for (const season of seasons) {
    const customers = historicalBySeason.get(season) ?? [];
    identityMapBySeason.set(season, buildServiceIdentityMap(customers));
  }
  // Append current season
  const currentSeason = seasons[seasons.length - 1] + 1;
  identityMapBySeason.set(currentSeason, buildServiceIdentityMap(currentCustomers));

  return buildChurnRecordsFromMaps(identityMapBySeason, [...seasons, currentSeason]);
}

/**
 * Builds churn records at the program level across all provided seasons.
 */
export function buildProgramChurnRecords(
  historicalBySeason: Map<number, Customer[]>,
  currentCustomers: Customer[],
  seasons: number[],
): ChurnRecord[] {
  const identityMapBySeason = new Map<number, Map<string, number>>();
  for (const season of seasons) {
    const customers = historicalBySeason.get(season) ?? [];
    identityMapBySeason.set(season, buildProgramIdentityMap(customers));
  }
  const currentSeason = seasons[seasons.length - 1] + 1;
  identityMapBySeason.set(currentSeason, buildProgramIdentityMap(currentCustomers));

  return buildChurnRecordsFromMaps(identityMapBySeason, [...seasons, currentSeason]);
}

/**
 * Builds churn records at the customer level across all provided seasons.
 */
export function buildCustomerChurnRecords(
  historicalBySeason: Map<number, Customer[]>,
  currentCustomers: Customer[],
  seasons: number[],
): ChurnRecord[] {
  const identityMapBySeason = new Map<number, Map<string, number>>();
  for (const season of seasons) {
    const customers = historicalBySeason.get(season) ?? [];
    identityMapBySeason.set(season, buildCustomerIdentityMap(customers));
  }
  const currentSeason = seasons[seasons.length - 1] + 1;
  identityMapBySeason.set(currentSeason, buildCustomerIdentityMap(currentCustomers));

  return buildChurnRecordsFromMaps(identityMapBySeason, [...seasons, currentSeason]);
}

// ---------------------------------------------------------------------------
// Churn query functions
//
// These operate on a ChurnRecord[] and return filtered subsets.
// They are called by churnSelect.ts — components never call them directly.
// ---------------------------------------------------------------------------

/**
 * Entities that were absent for exactly x consecutive seasons between two
 * active seasons. "Consecutive" means the cancelled seasons form an unbroken
 * run between two active seasons.
 */
export function getChurnedForExactly(records: ChurnRecord[], x: number): ChurnRecord[] {
  return records.filter((record) => {
    if (record.activeSeasons.length < 2) return false;
    return hasConsecutiveAbsenceOfLength(record, x);
  });
}

/**
 * Entities that were absent for at least x consecutive seasons and then
 * returned (i.e., appear in a later active season).
 */
export function getReturnedAfterAtLeast(records: ChurnRecord[], x: number): ChurnRecord[] {
  return records.filter((record) => {
    if (record.activeSeasons.length < 2) return false;
    return hasConsecutiveAbsenceOfLength(record, x, "atLeast");
  });
}

function hasConsecutiveAbsenceOfLength(
  record: ChurnRecord,
  x: number,
  mode: "exactly" | "atLeast" = "exactly",
): boolean {
  const allSeasons = [...record.activeSeasons, ...record.cancelledSeasons].sort(
    (a, b) => a - b,
  );

  let consecutiveAbsent = 0;
  let foundReturn = false;
  let wasActive = false;

  for (const season of allSeasons) {
    const isActive = record.activeSeasons.includes(season);

    if (isActive) {
      // If we had a prior active period followed by an absence, this is a return.
      if (wasActive && consecutiveAbsent > 0) {
        const matches =
          mode === "exactly" ? consecutiveAbsent === x : consecutiveAbsent >= x;
        if (matches) foundReturn = true;
      }
      consecutiveAbsent = 0;
      wasActive = true;
    } else {
      // Only count absences after the entity has been active at least once.
      if (wasActive) consecutiveAbsent++;
    }
  }

  return foundReturn;
}

/**
 * Summarizes churn records into a distribution table:
 * how many entities were absent for 1, 2, 3, or 4+ seasons.
 */
export type ChurnDistributionRow = {
  absenceLength: number;
  label: string;
  count: number;
  revenueRecovered: number;
};

/**
 * Summarizes churn records into a distribution table.
 *
 * The number of rows is derived from `totalSeasons` — the total number of
 * seasons in the dataset (historical + current). The maximum meaningful
 * absence length is `totalSeasons - 2`: you need at least one active season
 * before the absence and one active season after it (the return).
 *
 * With 5 seasons (2022–2026): rows for 1, 2, 3 seasons absent.
 * With 6 seasons: rows for 1, 2, 3, 4 seasons absent.
 */
export function buildChurnDistribution(
  records: ChurnRecord[],
  totalSeasons: number,
): ChurnDistributionRow[] {
  // Need at least 3 seasons to have any meaningful churn (active → absent → return).
  const maxMeaningfulAbsence = Math.max(0, totalSeasons - 2);
  const rows: ChurnDistributionRow[] = [];

  for (let x = 1; x <= maxMeaningfulAbsence; x++) {
    const matching = getChurnedForExactly(records, x);
    const revenueRecovered = matching.reduce((sum, record) => {
      // Revenue recovered = revenue in the first active season after the absence
      const lastAbsence = Math.max(...record.cancelledSeasons);
      const returnSeason = record.activeSeasons.find((s) => s > lastAbsence);
      return sum + (returnSeason ? (record.revenueByActiveSeason.get(returnSeason) ?? 0) : 0);
    }, 0);

    rows.push({
      absenceLength: x,
      label: x === 1 ? "1 season" : `${x} seasons`,
      count: matching.length,
      revenueRecovered,
    });
  }

  return rows;
}

/**
 * The headline narrative stat: percentage of entities that cancelled and
 * eventually returned within the given number of seasons.
 */
export function computeReturnRate(records: ChurnRecord[], withinSeasons: number): number {
  const cancelled = records.filter((r) => r.cancelledSeasons.length > 0);
  if (cancelled.length === 0) return 0;
  const returned = getReturnedAfterAtLeast(cancelled, 1).filter((r) =>
    hasConsecutiveAbsenceOfLength(r, withinSeasons, "atLeast") === false ||
    hasConsecutiveAbsenceOfLength(r, 1),
  );
  const returnedWithin = cancelled.filter((r) =>
    r.activeSeasons.length >= 2 &&
    r.cancelledSeasons.some((absent) => {
      const nextActive = r.activeSeasons.find((s) => s > absent);
      return nextActive !== undefined && nextActive - absent <= withinSeasons;
    }),
  );
  return cancelled.length > 0 ? returnedWithin.length / cancelled.length : 0;
}
