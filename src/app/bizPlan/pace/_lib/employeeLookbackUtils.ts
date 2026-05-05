import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  CountSizePrice,
  CountSizePriceOps,
  baseCountSizePrice,
} from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";

// Sentinel key for null programType in Maps (Map keys must be strings).
export const NULL_PROGRAM_TYPE_KEY = "__null__";

export type LookbackStats = {
  maxDailyCSP: CountSizePrice;
  avgDailyCSP: CountSizePrice;
  // Total capacity across all programTypes on the employee's best day.
  // Used as the capacity denominator for fractionConsumed — not the per-type max.
  totalMaxDailyCSP: CountSizePrice;
};

/**
 * Returns the set of dates within the lookback window that are considered valid
 * production days. A date is invalid if:
 *   - No services were completed on it (completedCount === 0), OR
 *   - completedCount / assignedCount < threshold (when threshold > 0)
 *
 * "assignedCount" = distinct servIds that have any AssignmentDoc with schedDate === date.
 * "completedCount" = services with doneDate === date and status === "S".
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

  // Build completed counts per date — doneDate lives on production.doneDate (ServiceHistory)
  const completedPerDate = new Map<string, number>();
  for (const service of services) {
    if (service.status === "S" && service.production?.doneDate) {
      const doneDate = service.production.doneDate;
      completedPerDate.set(doneDate, (completedPerDate.get(doneDate) ?? 0) + 1);
    }
  }

  const validDates = new Set<string>();
  for (const [date, assignedServIds] of assignedPerDate) {
    const completedCount = completedPerDate.get(date) ?? 0;
    if (completedCount === 0) continue;
    if (threshold > 0 && completedCount / assignedServIds.size < threshold) {
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
 * Only services with doneDate in validDates are included.
 * Employee contribution per service = CountSizePriceOps.fromService(service) * doneBy.percent
 */
export function accumulateDailyProduction(
  services: Service[],
  validDates: Set<string>,
): Map<string, Map<string, CountSizePrice[]>> {
  // employeeId → programTypeKey → date → accumulated CSP for that day
  const accumulator = new Map<string, Map<string, Map<string, CountSizePrice>>>();

  for (const service of services) {
    if (service.status !== "S" || !service.production?.doneDate) continue;
    const doneDate = service.production.doneDate;
    if (!validDates.has(doneDate)) continue;

    const programTypeKey =
      service.servCode.progCode.programType ?? NULL_PROGRAM_TYPE_KEY;
    const serviceCSP = CountSizePriceOps.fromService(service);
    const date = doneDate; // doneDate already extracted above

    for (const doneBy of service.production.doneBys) {
      const employeeId = doneBy.employeeId;
      const contribution = CountSizePriceOps.multiply(serviceCSP, doneBy.percent);

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

/**
 * Derives max and average daily production from an array of per-day CSP totals.
 * Returns null if the array is empty (no valid production data).
 *
 * Max is computed per-dimension independently.
 * Avg is the mean across all days.
 *
 * totalMaxDailyCSP must be provided by the caller — it is the employee's total
 * production across all programTypes on their best day, used as the capacity
 * denominator for fractionConsumed.
 */
export function computeLookbackStats(
  dailyProductions: CountSizePrice[],
  totalMaxDailyCSP: CountSizePrice,
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

  return { maxDailyCSP, avgDailyCSP, totalMaxDailyCSP };
}
