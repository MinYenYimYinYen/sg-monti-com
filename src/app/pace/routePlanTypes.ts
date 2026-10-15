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
 */
export type EmployeeDayStatus =
  | { kind: "holiday" }
  | { kind: "unplanned-absence" }
  | { kind: "pto" }
  | { kind: "not-started" }
  | { kind: "done" }
  | { kind: "completed"; totalPrice: number; servCodeIds: string[] }
  | { kind: "scheduled"; serviceCount: number }
  | { kind: "projected"; groupLabel: string; goalDailyPrice: number | null }
  | { kind: "available" };

// ---------------------------------------------------------------------------
// Per-employee row within a date card
// ---------------------------------------------------------------------------

export type RoutePlanEmployee = {
  employeeId: string;
  name: string;
  status: EmployeeDayStatus;
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
