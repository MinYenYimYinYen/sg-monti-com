// ---------------------------------------------------------------------------
// Priority entries — single servCode or a group worked together
// ---------------------------------------------------------------------------

export type DayCrawlSingleEntry = {
  kind: "single";
  servCodeId: string;
};

/**
 * A group of servCodes always worked together on the same day.
 * The crawl drains all member pools simultaneously at the employee's totalAvgDailyPrice.
 * At most one member may be sequential — the group inherits that sequential identity.
 */
export type DayCrawlGroupEntry = {
  kind: "group";
  servCodeIds: string[];
  /** Display label, e.g. "RC1+R01". Defaults to servCodeIds.join("+"). */
  label: string;
};

export type DayCrawlPriorityEntry = DayCrawlSingleEntry | DayCrawlGroupEntry;

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
   * Priority-ordered list of entries (single servCodes or groups).
   * Index 0 = highest priority. Sourced from assignmentPlan.entries.
   */
  priorityEntries: DayCrawlPriorityEntry[];
  /**
   * Per-servCode daily production rate (avg daily price for the servCode's programType).
   * Used for single entries. Estimated employees receive team average ÷ known-employee count.
   * Missing entries mean the employee has no rate for that servCode (treated as zero).
   */
  dailyRates: Map<string, number>;
  /**
   * Employee's total avg daily price across all programTypes.
   * Used as the drain rate for group entries (full daily capacity).
   */
  totalAvgDailyPrice: number;
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
 * Recorded by the simulation when the employee's active entry changes.
 * entryLabel is a servCodeId for singles, or "SC1+SC2" for groups.
 */
export type EmployeeTimelineEvent =
  /** Employee begins working this entry for the first time. */
  | { kind: "starts"; entryLabel: string; fromEntryLabel: string | null }
  /** Employee's pool for this entry hits zero — fully drained. */
  | { kind: "finishes"; entryLabel: string }
  /**
   * Employee switches from one entry to another mid-season.
   * Happens when a higher-priority entry opens up, or the current one drains.
   */
  | { kind: "switches"; fromEntryLabel: string; toEntryLabel: string }
  /**
   * Employee has no eligible work — all open entries are locked, not yet open,
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

// ---------------------------------------------------------------------------
// ServCode timeline events (recorded during the crawl, keyed by entry label)
// ---------------------------------------------------------------------------

/**
 * A significant transition in a servCode/group's crew composition.
 * Recorded by the simulation when an employee starts, leaves, returns, or finishes.
 * entryLabel is a servCodeId for singles, or "SC1+SC2" for groups.
 */
export type ServCodeTimelineEvent = {
  date: string;
  employeeId: string;
  kind: "starts" | "leaves" | "returns" | "finishes";
  /** For "leaves" — the entry label the employee switched to. */
  toServCode?: string;
  /** For "returns" — the entry label the employee switched from. */
  fromServCode?: string;
  /** This employee's daily rate for this entry ($/day). */
  employeeDailyRate: number;
  /** Sum of all currently-active employees' rates for this entry after this event. */
  teamDailyRate: number;
  /** Pool remaining for this entry at the moment of this event. */
  poolRemaining: number;
};

// ---------------------------------------------------------------------------
// Output of the day-crawl simulation
// ---------------------------------------------------------------------------

/**
 * Full output of the day-crawl simulation.
 */
export type CrawlerResult = {
  byServCode: Map<string, CrawlerServCodeResult>;
  /** Per-employee ordered list of timeline events recorded during the crawl. */
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;
  /** Per-entry (servCode or group label) ordered list of crew transition events. */
  servCodeTimeline: Map<string, ServCodeTimelineEvent[]>;
};
