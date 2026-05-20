// ---------------------------------------------------------------------------
// Inputs to the day-crawl simulation
// ---------------------------------------------------------------------------

/**
 * One servCode's entry in the day-crawl simulation.
 * The caller is responsible for resolving openDateFloor and pool before passing in.
 */
export type DayCrawlServCodeEntry = {
  servCodeId: string;
  progCodeId: string;
  /** True when this progCode's servCodes run sequentially (N+1 opens after N drains). */
  runsInSequence: boolean;
  /**
   * The earliest calendar date this servCode is eligible to be worked.
   * For independent servCodes and the first servCode of a sequential progCode: dateRange.min.
   * For sequential N+1 servCodes: set dynamically during the crawl when N drains.
   */
  openDateFloor: string;
  /** Remaining unscheduled work pool — price (dollars) only. */
  pool: number;
  /** Padding days added to projectedEndDate to compute proposedMax. */
  paddingDays: number;
  /** dateRange.max from RealGreen — used as fallback proposedMax when no lookback data. */
  currentMax: string;
};

/**
 * One employee's entry in the day-crawl simulation.
 */
export type DayCrawlEmployeeEntry = {
  employeeId: string;
  /**
   * Priority-ordered list of servCode IDs this employee is assigned to.
   * Index 0 = highest priority. Sourced from assignmentPlan.servCodeIds.
   */
  servCodeIds: string[];
  /**
   * Per-servCode daily production rate (avg daily price for the servCode's programType).
   * Estimated employees receive team average ÷ known-employee count.
   * Missing entries mean the employee has no rate for that servCode (treated as zero).
   */
  dailyRates: Map<string, number>;
  /**
   * The next weekday this employee is available to work unscheduled jobs.
   * = nextWeekdayAfter(employee's latest printed schedDate across all servCodes)
   * = today if no printed services.
   */
  nextAvailableDate: string;
};

// ---------------------------------------------------------------------------
// Employee timeline events (recorded during the crawl)
// ---------------------------------------------------------------------------

/**
 * A significant transition in an employee's work schedule.
 * Recorded by the simulation when the employee's active servCode changes.
 */
export type EmployeeTimelineEvent =
  /** Employee begins working this servCode for the first time. */
  | { kind: "starts"; servCodeId: string; fromServCodeId: string | null }
  /** Employee's pool for this servCode hits zero — fully drained. */
  | { kind: "finishes"; servCodeId: string }
  /**
   * Employee switches from one servCode to another mid-season.
   * Happens when a higher-priority servCode opens up, or the current one drains.
   */
  | { kind: "switches"; fromServCodeId: string; toServCodeId: string }
  /**
   * Employee has no eligible work — all open servCodes are locked, not yet open,
   * or have zero pool. Recorded once at the start of each downtime stretch.
   */
  | { kind: "downtime" };

// ---------------------------------------------------------------------------
// Output of the day-crawl simulation
// ---------------------------------------------------------------------------

/**
 * The result of running the day-crawl simulation for one servCode.
 */
export type CrawlerServCodeResult = {
  servCodeId: string;
  /**
   * The effective open date floor used in the crawl.
   * For sequential N+1 servCodes, this is the dynamically resolved date
   * (max of dateRange.min and projectedEndDate[N] + 1 weekday).
   */
  resolvedOpenDateFloor: string;
  /**
   * The day the work pool's price hit zero.
   * Null when no employees have lookback data and the pool could not be drained.
   */
  projectedEndDate: string | null;
  /**
   * The proposed season start date for this servCode.
   * = resolvedOpenDateFloor
   */
  proposedMin: string;
  /**
   * The proposed season end date for this servCode.
   * = addWeekdays(projectedEndDate, paddingDays) when projectedEndDate is known.
   * = currentMax (dateRange.max) as fallback when no lookback data.
   */
  proposedMax: string;
};

/**
 * Full output of the day-crawl simulation.
 */
export type CrawlerResult = {
  byServCode: Map<string, CrawlerServCodeResult>;
  /** Per-employee ordered list of timeline events recorded during the crawl. */
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
};
