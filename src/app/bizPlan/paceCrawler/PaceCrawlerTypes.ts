// ---------------------------------------------------------------------------
// Priority entries — single servCode or a group worked together
// ---------------------------------------------------------------------------

import {TRange} from "@/lib/primatives/tRange/TRange";

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
 * The caller is responsible for resolving servCodeRangeMin and pool before passing in.
 */
export type DayCrawlServCodeEntry = {
  servCodeId: string;
  progCodeId: string;
  /** True when this progCode's servCodes run sequentially (N+1 opens after N drains). */
  runsInSequence: boolean;
  /**
   * The earliest calendar date this servCode is eligible to be worked.
   * = servCode.dateRange.min for independent servCodes and the first in a sequential progCode.
   * = dynamically resolved during the crawl when the predecessor drains (for N+1 servCodes).
   */
  servCodeRangeMin: string;
  /** Remaining unscheduled work pool — price (dollars) only. */
  pool: number;
  /** servCode.dateRange.max from RealGreen — used as fallback optimizedMax when no lookback data. */
  servCodeRangeMax: string;
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
   * The effective start date used in the crawl.
   * For sequential N+1 servCodes, this is the dynamically resolved date
   * (= projectedEndDate[N], the day the predecessor drained).
   * This is the crawler's recommended new season start.
   */
  optimizedMin: string;
  /**
   * The day the work pool's price hit zero.
   * Null when no employees have lookback data and the pool could not be drained.
   */
  projectedEndDate: string | null;
  /**
   * The crawler's recommended new season end date.
   * = projectedEndDate when known, or servCodeRangeMax (servCode.dateRange.max) as fallback.
   */
  optimizedMax: string;
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
  employeeTimeline: Map<
    string,
    { date: string; event: EmployeeTimelineEvent }[]
  >;
  /** Per-entry (servCode or group label) ordered list of crew transition events. */
  servCodeTimeline: Map<string, ServCodeTimelineEvent[]>;
};

/** One row of season optimizer output per servCode. */
export type SeasonOptimizedRange = {
  servCodeId: string;
  progCodeId: string;
  servCodeName: string;
  /** The existing RealGreen-assigned date range for this servCode. */
  servCodeRange: TRange<string>;
  /** Crawler's recommended new start date. */
  optimizedMin: string;
  /** Crawler's recommended new end date — projectedEndDate, or servCodeRange.max if no data. */
  optimizedMax: string;
  projectedEndDate: string | null;
  runsInSequence: boolean;
  /** True when the servCode's pool has already started (optimizedMin ≤ today) */
  isStarted: boolean;
  /** True when there's unscheduled work and a projected end date exists */
  hasWork: boolean;
};

export type ServCodePaceDelta = {
  servCodeId: string;
  /** The existing RealGreen-assigned date range for this servCode. */
  servCodeRange: TRange<string>;
  projectedEndDate: string | null;
  deltaDays: number | null;
  deltaDaysCSP: {
    count: number | null;
    size: number | null;
    price: number | null;
  } | null;
};

/** Projected completion date for a ProgCode (latest projected end date across all its servCodes). */
export type ProgCodeProjectedCompletion = {
  /** The projected completion date (ISO date string), or null if no servCodes have data. */
  date: string | null;
  /**
   * True if any servCode in the progCode had no team lookback data and fell back to
   * servCodeRange.max as its projected end date. Muted styling should be applied when true.
   */
  isEstimated: boolean;
};
