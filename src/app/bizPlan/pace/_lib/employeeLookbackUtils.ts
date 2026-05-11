import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

// Printed services are committed to a specific schedDate and will be done.
// Include them in lookback as "effectively completed" so the avg daily capacity
// reflects what the team actually does, not just what's been marked done.
const PRINTED_STATUSES = getServiceStatuses(["printed"]);
const COMPLETED_STATUSES = getServiceStatuses(["completed"]);

// Sentinel key for null programType in Maps (Map keys must be strings).
export const NULL_PROGRAM_TYPE_KEY = "__null__";

export type LookbackStats = {
  maxDailyCSP: CountSizePrice;
  avgDailyCSP: CountSizePrice;
  // Total capacity across all programTypes on the employee's best day.
  // Kept for display purposes only — not used as the capacity ceiling.
  totalMaxDailyCSP: CountSizePrice;
  // Mean total daily production across all programTypes.
  // Used as the capacity ceiling for cascade allocation and fractionConsumed denominator.
  // More realistic than totalMaxDailyCSP, which is a per-dimension phantom (never actually achieved).
  totalAvgDailyCSP: CountSizePrice;
};

/**
 * Returns the set of dates within the lookback window that are considered valid
 * production days. A date is invalid if:
 *   - No services were completed/printed on it (effectiveCount === 0), OR
 *   - effectiveCount / assignedCount < threshold (when threshold > 0)
 *
 * "assignedCount" = distinct servIds that have any AssignmentDoc with schedDate === date.
 * "effectiveCount" = completed (doneDate === date) + printed (schedDate === date).
 *   Printed services are committed to their schedDate and treated as effectively done.
 *
 * Invalidation is per-date only — not per employee, not per servCode.
 */
export function getValidProductionDates(
  services: Service[],
  threshold: number,
): Set<string> {
  // Build assigned counts per date (all AssignmentDocs, not just the last)
  const assignedPerDate = new Map<string, Set<number>>();
  for (const service of services) {
    for (const assignment of service.assignments) {
      const date = assignment.schedDate;
      const existing = assignedPerDate.get(date) ?? new Set<number>();
      existing.add(service.servId);
      assignedPerDate.set(date, existing);
    }
  }

  // Build effective counts per date:
  // - Completed: use production.doneDate
  // - Printed: use lastAssigned.schedDate (committed, will be done)
  const effectivePerDate = new Map<string, number>();
  for (const service of services) {
    if (COMPLETED_STATUSES.includes(service.status) && service.production?.doneDate) {
      const doneDate = service.production.doneDate;
      effectivePerDate.set(doneDate, (effectivePerDate.get(doneDate) ?? 0) + 1);
    } else if (PRINTED_STATUSES.includes(service.status) && service.lastAssigned.schedDate) {
      const schedDate = service.lastAssigned.schedDate;
      effectivePerDate.set(schedDate, (effectivePerDate.get(schedDate) ?? 0) + 1);
    }
  }

  const validDates = new Set<string>();
  for (const [date, assignedServIds] of assignedPerDate) {
    const effectiveCount = effectivePerDate.get(date) ?? 0;
    if (effectiveCount === 0) continue;
    if (threshold > 0 && effectiveCount / assignedServIds.size < threshold) {
      continue;
    }
    validDates.add(date);
  }

  return validDates;
}

/**
 * For each valid production date, accumulates each employee's CSP contribution
 * grouped by programType.
 *
 * Returns: Map<employeeId, Map<programType | "__null__", CountSizePrice[]>>
 * Each inner array entry is one valid day's total production for that employee+programType.
 *
 * Includes both completed services (by doneDate) and printed services (by schedDate).
 * Printed services are committed to their schedDate and treated as effectively done.
 * Employee contribution per service = CountSizePriceOps.fromService(service) * doneBy.percent
 */
export function accumulateDailyProduction(
  services: Service[],
  validDates: Set<string>,
): Map<string, Map<string, CountSizePrice[]>> {
  // employeeId → programTypeKey → date → accumulated CSP for that day
  const accumulator = new Map<string, Map<string, Map<string, CountSizePrice>>>();

  for (const service of services) {
    // Determine effective date: completed uses doneDate, printed uses schedDate
    let effectiveDate: string | null = null;
    if (COMPLETED_STATUSES.includes(service.status) && service.production?.doneDate) {
      effectiveDate = service.production.doneDate;
    } else if (PRINTED_STATUSES.includes(service.status) && service.lastAssigned.schedDate) {
      effectiveDate = service.lastAssigned.schedDate;
    }

    if (!effectiveDate || !validDates.has(effectiveDate)) continue;

    const programTypeKey =
      service.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
    const serviceCSP = CountSizePriceOps.fromService(service);

    // For completed services, use production.doneBys for employee attribution.
    // For printed services, use lastAssigned.employeeId (the assigned employee).
    if (COMPLETED_STATUSES.includes(service.status) && service.production?.doneBys) {
      for (const doneBy of service.production.doneBys) {
        const employeeId = doneBy.employeeId;
        const contribution = CountSizePriceOps.multiply(serviceCSP, doneBy.percent);
        accumulateContribution(accumulator, employeeId, programTypeKey, effectiveDate, contribution);
      }
    } else if (PRINTED_STATUSES.includes(service.status) && service.lastAssigned.employeeId) {
      // Printed: attribute 100% to the assigned employee
      accumulateContribution(accumulator, service.lastAssigned.employeeId, programTypeKey, effectiveDate, serviceCSP);
    }
  }

  // Flatten the date-keyed inner map to an array of daily totals
  const result = new Map<string, Map<string, CountSizePrice[]>>();
  for (const [employeeId, byProgramType] of accumulator) {
    const programTypeMap = new Map<string, CountSizePrice[]>();
    for (const [programTypeKey, byDate] of byProgramType) {
      programTypeMap.set(programTypeKey, Array.from(byDate.values()));
    }
    result.set(employeeId, programTypeMap);
  }

  return result;
}

function accumulateContribution(
  accumulator: Map<string, Map<string, Map<string, CountSizePrice>>>,
  employeeId: string,
  programTypeKey: string,
  date: string,
  contribution: CountSizePrice,
): void {
  if (!accumulator.has(employeeId)) {
    accumulator.set(employeeId, new Map());
  }
  const byProgramType = accumulator.get(employeeId)!;

  if (!byProgramType.has(programTypeKey)) {
    byProgramType.set(programTypeKey, new Map());
  }
  const byDate = byProgramType.get(programTypeKey)!;

  const existing = byDate.get(date) ?? { ...baseCountSizePrice };
  byDate.set(date, CountSizePriceOps.sum(existing, contribution));
}

/**
 * Derives max and average daily production from an array of per-day CSP totals.
 * Returns null if the array is empty (no valid production data).
 *
 * Max and avg are computed per-dimension independently.
 *
 * totalMaxDailyCSP — employee's best single day across all programTypes (display only).
 * totalAvgDailyCSP — employee's mean daily output across all programTypes; used as the
 *   cascade capacity ceiling and fractionConsumed denominator. More realistic than max
 *   because totalMaxDailyCSP is a per-dimension phantom that never actually occurred.
 */
export function computeLookbackStats(
  dailyProductions: CountSizePrice[],
  totalMaxDailyCSP: CountSizePrice,
  totalAvgDailyCSP: CountSizePrice,
): LookbackStats | null {
  if (dailyProductions.length === 0) return null;

  const maxDailyCSP = dailyProductions.reduce(
    (max, day) => ({
      count: Math.max(max.count, day.count),
      size: Math.max(max.size, day.size),
      price: Math.max(max.price, day.price),
      rev: Math.max(max.rev, day.rev),
    }),
    { ...baseCountSizePrice },
  );

  const sum = CountSizePriceOps.sumAll(dailyProductions);
  const avgDailyCSP = CountSizePriceOps.divideBy(sum, dailyProductions.length);

  return { maxDailyCSP, avgDailyCSP, totalMaxDailyCSP, totalAvgDailyCSP };
}
