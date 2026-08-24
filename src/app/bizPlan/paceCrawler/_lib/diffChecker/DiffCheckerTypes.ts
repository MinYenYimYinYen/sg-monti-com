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
 * One row in an employee's card — a single open servCode with diff data.
 * Used for single-entry rows (kind = "single").
 */
export type OpenServCodeRow = {
  kind: "single";
  servCodeId: string;
  historicalDailyPrice: number;
  requiredDailyPrice: number;
  diffPrice: number;
  diffPercent: number | null;
  poolRemaining: number;
  remainingWeekdays: number;
  isOverdue: boolean;
  isAhead: boolean;
  isBehind: boolean;
};

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
 * The header shows the sum of per-member required rates vs totalAvgDailyPrice.
 */
export type OpenGroupRow = {
  kind: "group";
  groupId: string;
  label: string;
  servCodeIds: string[];
  combinedPool: number;
  /**
   * Sum of per-member required rates (each member: pool / weekdays_to_member_scMax).
   * This is the total "how much do I need to route today" for this group.
   */
  requiredDailyPrice: number;
  /** Employee's totalAvgDailyPrice — the actual drain rate for this group */
  historicalDailyPrice: number;
  diffPrice: number;
  diffPercent: number | null;
  /** Latest member dateRange.max — shown on the header as the group's window */
  latestScMax: string;
  latestRemainingWeekdays: number;
  /** True if ANY member is overdue */
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
  openEntries: (OpenServCodeRow | OpenGroupRow)[];
  /** All servCodeIds in the employee's assignment plan (for context). */
  assignedServCodeIds: string[];
};
