import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  CSP,
  CSPOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

// Printed services are committed to a specific schedDate and will be done.
// Include them in lookback as "effectively completed" so the avg daily capacity
// reflects what the team actually does, not just what's been marked done.
const PRINTED_STATUSES = getServiceStatuses(["printed"]);
const COMPLETED_STATUSES = getServiceStatuses(["completed"]);

// Sentinel key for null programType in Maps (Map keys must be strings).
export const NULL_PROGRAM_TYPE_KEY = "__null__";

export type LookbackStats = {
  maxDailyCSP: CSP;
  avgDailyCSP: CSP;
  totalAvgDailyCSP: CSP;
};

// ---------------------------------------------------------------------------
// getValidProductionDates
// ---------------------------------------------------------------------------

// Builds a map of date → set of distinct servIds that were assigned on that date.
function buildAssignedServIdsPerDate(services: Service[]): Map<string, Set<number>> {
  const assignedPerDate = new Map<string, Set<number>>();
  for (const service of services) {
    for (const assignment of service.assignments) {
      const date = assignment.schedDate;
      const existing = assignedPerDate.get(date) ?? new Set<number>();
      existing.add(service.servId);
      assignedPerDate.set(date, existing);
    }
  }
  return assignedPerDate;
}

// Builds a map of date → count of effectively completed/printed services on that date.
function buildEffectiveCompletionCountPerDate(services: Service[]): Map<string, number> {
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
  return effectivePerDate;
}

// Filters the assigned-date map to only dates that meet the completion threshold.
function filterToValidDates(
  assignedPerDate: Map<string, Set<number>>,
  effectivePerDate: Map<string, number>,
  threshold: number,
): Set<string> {
  const validDates = new Set<string>();
  for (const [date, assignedServIds] of assignedPerDate) {
    const effectiveCount = effectivePerDate.get(date) ?? 0;
    if (effectiveCount === 0) continue;
    if (threshold > 0 && effectiveCount / assignedServIds.size < threshold) continue;
    validDates.add(date);
  }
  return validDates;
}

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
  const assignedPerDate = buildAssignedServIdsPerDate(services);
  const effectivePerDate = buildEffectiveCompletionCountPerDate(services);
  return filterToValidDates(assignedPerDate, effectivePerDate, threshold);
}

// ---------------------------------------------------------------------------
// accumulateDailyProduction
// ---------------------------------------------------------------------------

// Returns the effective production date for a service:
// completed services use doneDate, printed services use schedDate.
// Returns null if the service has no applicable date.
export function getServiceEffectiveDate(service: Service): string | null {
  if (COMPLETED_STATUSES.includes(service.status) && service.production?.doneDate) {
    return service.production.doneDate;
  }
  if (PRINTED_STATUSES.includes(service.status) && service.lastAssigned.schedDate) {
    return service.lastAssigned.schedDate;
  }
  return null;
}

function accumulateContribution(
  accumulator: Map<string, Map<string, Map<string, CSP>>>,
  employeeId: string,
  programTypeKey: string,
  date: string,
  contribution: CSP,
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
  byDate.set(date, CSPOps.sum(existing, contribution));
}

/**
 * For each valid production date, accumulates each employee's CSP contribution
 * grouped by programType.
 *
 * Returns: Map<employeeId, Map<programType | "__null__", CSP[]>>
 * Each inner array entry is one valid day's total production for that employee+programType.
 *
 * Includes both completed services (by doneDate) and printed services (by schedDate).
 * Printed services are committed to their schedDate and treated as effectively done.
 * Employee contribution per service = CSPOps.fromService(service) * doneBy.percent
 */
export function accumulateDailyProduction(
  services: Service[],
  validDates: Set<string>,
): Map<string, Map<string, CSP[]>> {
  // employeeId → programTypeKey → date → accumulated CSP for that day
  const accumulator = new Map<string, Map<string, Map<string, CSP>>>();

  for (const service of services) {
    const effectiveDate = getServiceEffectiveDate(service);
    if (!effectiveDate || !validDates.has(effectiveDate)) continue;

    const programTypeKey =
      service.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
    const serviceCSP = CSPOps.fromService(service);

    // For completed services, use production.doneBys for employee attribution.
    // For printed services, use lastAssigned.employeeId (the assigned employee).
    if (COMPLETED_STATUSES.includes(service.status) && service.production?.doneBys) {
      for (const doneBy of service.production.doneBys) {
        const employeeId = doneBy.employeeId;
        const contribution = CSPOps.multiply(serviceCSP, doneBy.percent);
        accumulateContribution(accumulator, employeeId, programTypeKey, effectiveDate, contribution);
      }
    } else if (PRINTED_STATUSES.includes(service.status) && service.lastAssigned.employeeId) {
      // Printed: attribute 100% to the assigned employee
      accumulateContribution(accumulator, service.lastAssigned.employeeId, programTypeKey, effectiveDate, serviceCSP);
    }
  }

  // Flatten the date-keyed inner map to an array of daily totals
  const result = new Map<string, Map<string, CSP[]>>();
  for (const [employeeId, byProgramType] of accumulator) {
    const programTypeMap = new Map<string, CSP[]>();
    for (const [programTypeKey, byDate] of byProgramType) {
      programTypeMap.set(programTypeKey, Array.from(byDate.values()));
    }
    result.set(employeeId, programTypeMap);
  }

  return result;
}

// ---------------------------------------------------------------------------
// computeLookbackStats
// ---------------------------------------------------------------------------

// Returns the component-wise maximum CSP across all daily production entries.
function computeMaxDailyCSP(dailyProductions: CSP[]): CSP {
  return dailyProductions.reduce(
    (max, day) => ({
      count: Math.max(max.count, day.count),
      size: Math.max(max.size, day.size),
      price: Math.max(max.price, day.price),
      rev: Math.max(max.rev, day.rev),
    }),
    { ...baseCountSizePrice },
  );
}

export function computeLookbackStats(
  dailyProductions: CSP[],
  totalAvgDailyCSP: CSP,
): LookbackStats | null {
  if (dailyProductions.length === 0) return null;

  const maxDailyCSP = computeMaxDailyCSP(dailyProductions);
  const sum = CSPOps.sumAll(dailyProductions);
  const avgDailyCSP = CSPOps.divideBy(sum, dailyProductions.length);

  return { maxDailyCSP, avgDailyCSP, totalAvgDailyCSP };
}
