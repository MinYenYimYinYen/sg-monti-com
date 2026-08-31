import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

// ---------------------------------------------------------------------------
// Step D3 — Required Daily Entry
// ---------------------------------------------------------------------------

/**
 * The required daily price for one employee × servCode pair.
 * Computed by dividing the employee's proportional share of the remaining pool
 * by the number of weekdays left in the committed servCode.dateRange.
 */
export type RequiredDailyEntry = {
  servCodeId: string;
  activePool: number;
  remainingWeekdays: number;
  /** Employee's proportional share of the pool (weighted by their daily rate vs team total). */
  employeeShare: number;
  /** employeeShare / remainingWeekdays. Infinity when isOverdue. */
  requiredDailyPrice: number;
  /** True when remainingWeekdays <= 0 (dateRange.max is in the past). */
  isOverdue: boolean;
};

// ---------------------------------------------------------------------------
// Step D4 — Diff Result
// ---------------------------------------------------------------------------

/**
 * Comparison of required daily price vs the employee's historical average for one servCode.
 * The historical average is the simulator's source of truth (dailyRateByEmployeeByServCode).
 */
export type DiffResult = {
  servCodeId: string;
  /** What the DiffChecker says is needed to finish on time. */
  requiredDailyPrice: number;
  /** The employee's historical avg daily price for this servCode (simulator baseline). */
  historicalDailyPrice: number;
  /** requiredDailyPrice - historicalDailyPrice. Positive = need to do more, negative = ahead. */
  diffPrice: number;
  /** diffPrice / historicalDailyPrice. Null when historicalDailyPrice is 0. */
  diffPercent: number | null;
  isOverdue: boolean;
  /** diffPrice < 0 — employee is producing more than needed to stay on track. */
  isAhead: boolean;
  /** diffPrice > 0 — employee needs to produce more than their historical average. */
  isBehind: boolean;
};

// ---------------------------------------------------------------------------
// Step D5 — Employee Card Data
// ---------------------------------------------------------------------------

/**
 * One member servCode within an expanded group row.
 * Shows per-member pool, required rate, and individual deadline.
 */
export type OpenGroupMemberRow = {
  servCodeId: string;
  poolRemaining: number;
  /** pool / weekdays_to_member_scMax — this member's urgency rate */
  requiredDailyPrice: number;
  remainingWeekdays: number;
  /** This member's dateRange.max */
  scMax: string;
  isOverdue: boolean;
};

/**
 * A group entry on an employee's card — header + expandable members.
 * The header shows goal / avg / required rates with days-ahead/behind per row.
 */
export type OpenGroupRow = {
  kind: "group";
  groupId: string;
  label: string;
  servCodeIds: string[];
  combinedPool: number;
  /** Employee's proportional share of (groupPool / planDeadlineWeekdays). */
  requiredDailyPrice: number;
  /** Employee's daily revenue goal for this group ($/day). Null when not set. */
  goalDailyPrice: number | null;
  /** Employee's totalAvgDailyPrice — the lookback average drain rate. */
  historicalDailyPrice: number;
  diffPrice: number;
  diffPercent: number | null;
  /** Latest member dateRange.max — shown on the header as the group's window. */
  latestScMax: string;
  latestRemainingWeekdays: number;
  /**
   * Weekdays remaining to the plan deadline (plannedEnd ?? latestScMax).
   * Used to compute days-late for goal and avg rows.
   * Negative when the plan deadline has passed — allows meaningful delta computation.
   */
  planDeadlineWeekdays: number;
  /**
   * The whole-group required rate: combinedPool / planDeadlineWeekdays.
   * Used to compute days-late: round(combinedPool / teamRate) - planDeadlineWeekdays.
   * 0 when planDeadlineWeekdays is 0 (overdue).
   */
  groupRequiredRate: number;
  /**
   * Sum of all employees' goals (or avg fallback) for this group.
   * Used as the team's total goal rate for days-late computation.
   */
  sumGoals: number;
  /**
   * Sum of all employees' totalAvgDailyPrice for this group.
   * Used to compute days-late for the avg row: round(combinedPool / sumAvgs) - planDeadlineWeekdays.
   */
  sumAvgs: number;
  /**
   * The plan deadline date string (season plan plannedEnd, or null if no season plan).
   * Shown in the card header as the authoritative "ends" date.
   */
  planDeadline: string | null;
  /** True if ANY member is overdue OR the plan deadline has passed. */
  isOverdue: boolean;
  isAhead: boolean;
  isBehind: boolean;
  members: OpenGroupMemberRow[];
};

/**
 * All display data for one employee's card.
 */
export type EmployeeCardData = {
  employee: Employee;
  /** True when the employee has any printed service (status "$") with schedDate === mainDate. */
  isAlreadyRouted: boolean;
  /** True when the employee has personal planned time off covering mainDate. */
  isOnLeave: boolean;
  /** True when a company holiday covers mainDate (applies to all employees). */
  isHoliday: boolean;
  /** Priority-ordered open entries for this employee on mainDate (pool > 0, date in range). */
  openEntries: OpenGroupRow[];
  /** All servCodeIds in the employee's assignment plan (for context). */
  assignedServCodeIds: string[];
};
