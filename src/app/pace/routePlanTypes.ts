import { CrawlerDayPhase } from "@/app/pace/lib/crawlerDay/CrawlerDay";

// ---------------------------------------------------------------------------
// Employee day status — why an employee is or isn't available on a given date
// ---------------------------------------------------------------------------

/**
 * Priority order (checked top to bottom — first match wins):
 *   1. holiday          — date is a company holiday or weather day (blocks everyone)
 *   2. unplanned-absence — employee has an unplanned absence (requestType === "unplannedAbsence")
 *   3. pto              — employee has planned time off (plannedDates or plannedTime)
 *   4. not-started      — date is before the employee's availability.startDate
 *   5. done             — date is after the employee's availability.endDate
 *   6. completed        — past date: employee completed work (has production records)
 *   7. scheduled        — employee has a printed service on this date (already routed)
 *   8. projected        — pace engine projects this employee working on this date
 *   9. available        — employee is in the plan but no work is projected or scheduled
 *
 * Note: statuses 2–3 (pto/unplanned-absence) and 7 (scheduled) can co-occur.
 * When they do, `RoutePlanEmployee.statuses` will contain both, and
 * `hasSchedulingConflict()` will return true.
 */
export type EmployeeDayStatus =
  | { kind: "holiday" }
  | { kind: "unplanned-absence" }
  | { kind: "pto" }
  | { kind: "not-started" }
  | { kind: "done" }
  | { kind: "completed"; totalPrice: number; servCodeIds: string[] }
  | { kind: "scheduled"; serviceCount: number; totalPrice: number; servCodeIds: string[]; goalDailyPrice: number | null }
  | { kind: "projected"; groupLabel: string; goalDailyPrice: number | null }
  | { kind: "available" };

/**
 * One or more statuses for an employee on a given date.
 * Normally a single-element array. Two elements signals a scheduling conflict
 * (e.g., ["scheduled", "pto"] or ["scheduled", "unplanned-absence"]).
 */
export type EmployeeDayStatuses = EmployeeDayStatus[];

/**
 * The status kinds that, when combined with "scheduled", represent a conflict.
 *
 * - "pto"               → planned dates / planned time — employee requested off
 * - "unplanned-absence" → unplanned absence — employee is unexpectedly out
 * - "holiday"           → company holiday or weather day — no one should be working,
 *                         but the CRM may still have printed services that need resolving
 */
const CONFLICT_ABSENCE_KINDS = new Set<EmployeeDayStatus["kind"]>(["pto", "unplanned-absence", "holiday"]);

/**
 * Returns true when the statuses represent a scheduling conflict:
 * the employee is both scheduled for work and has a blocking status.
 *
 * Examples:
 *   PTO + scheduled      → conflict (customers pre-notified but employee is off)
 *   Holiday + scheduled  → conflict (weather/holiday day but services are still printed)
 *   PTO + holiday        → NOT a conflict (both mean no work — they agree)
 */
export function hasSchedulingConflict(statuses: EmployeeDayStatuses): boolean {
  const kinds = statuses.map((s) => s.kind);
  return kinds.some((k) => CONFLICT_ABSENCE_KINDS.has(k)) && kinds.includes("scheduled");
}

// ---------------------------------------------------------------------------
// Per-employee row within a date card
// ---------------------------------------------------------------------------

export type RoutePlanEmployee = {
  employeeId: string;
  name: string;
  /**
   * All statuses that apply to this employee on this date.
   * Normally one status; two statuses indicates a conflict (see hasSchedulingConflict).
   */
  statuses: EmployeeDayStatuses;
};

// ---------------------------------------------------------------------------
// One date card — covers a single weekday
// ---------------------------------------------------------------------------

export type RoutePlanDay = {
  date: string;
  phase: CrawlerDayPhase;
  isHoliday: boolean;
  isWeatherDay: boolean;
  /** Description of the holiday/weather event, if any. */
  holidayDescription: string | null;
  /** Employees in the active assignment plan, sorted alphabetically. */
  employees: RoutePlanEmployee[];
};
