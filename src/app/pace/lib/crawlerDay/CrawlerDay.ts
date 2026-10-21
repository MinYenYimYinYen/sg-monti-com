/** Which phase of the crawl produced this day's snapshot. */
export type CrawlerDayPhase = "past" | "present" | "future";

// ---------------------------------------------------------------------------
// DaysSinceAnalysis — per-day constraint state for constrained successor groups
// ---------------------------------------------------------------------------

/**
 * Quartile distribution of elapsed days (calendar days since predecessor completion).
 * null when fewer than 4 data points.
 */
export type ElapsedDaysDistribution = {
  q1: number;
  median: number;
  q3: number;
};

/**
 * Snapshot of daysSince constraint state for a constrained successor group on a single crawl day.
 *
 * Two distributions are captured:
 *   - `availableElapsedDays`: how long available services have been waiting (aging signal).
 *     High median → team is moving too slow; customers may notice.
 *   - `lockedDaysUntilUnlock`: how many more days until each locked service clears the constraint.
 *     Low q1 → near-term replenishment wave incoming.
 *
 * Both distributions are computed only over services where the predecessor IS done
 * (we have a real elapsedDays value). Services with no predecessor completion are
 * counted separately in `countPredecessorNotDone`.
 */
export type DaysSinceAnalysis = {
  /** The required minimum gap (calendar days) for this sequence. */
  daysSince: number;
  /** Services ready to schedule (elapsedDays >= daysSince). Primary capacity signal. */
  countAvailable: number;
  /** Services whose predecessor is done but elapsedDays < daysSince. */
  countLocked: number;
  /** Services whose predecessor has not yet been completed (historical or projected). */
  countPredecessorNotDone: number;
  /**
   * Distribution of elapsed days for available services (elapsedDays >= daysSince).
   * High median = services are aging = team is moving too slow.
   * null if fewer than 4 available services.
   */
  availableElapsedDays: ElapsedDaysDistribution | null;
  /**
   * Distribution of (daysSince - elapsedDays) for locked services — days remaining
   * until each locked service clears the constraint.
   * Low q1 = near-term replenishment wave incoming.
   * null if fewer than 4 locked services.
   */
  lockedDaysUntilUnlock: ElapsedDaysDistribution | null;
};

/**
 * One employee's contribution to a group on a single crawl day.
 * Past phase: priceCompleted from service.production.doneBys; priceForecasted = 0.
 * Future phase: priceCompleted = drained amount; priceForecasted = goalDailyPrice.
 */
export type CrawlerDayEmployee = {
  employeeId: string;
  /** $ this employee contributed to this group on this specific day. */
  priceCompleted: number;
  /** This employee's goalDailyPrice for this group on this day (0 in past phase). */
  priceForecasted: number;
  /** Cumulative $ this employee has contributed to this group across all days up to and including this one. */
  priceCompletedSoFar: number;
};

/**
 * One group's state on a single crawl day.
 * Only groups with active pool on this day are included (locked groups excluded).
 */
export type CrawlerDayGroup = {
  groupId: string;
  label: string;
  /** The user-created sequenceId this group belongs to. null for synthetic single-member sequences. */
  sequenceId: string | null;
  /** Cumulative $ completed across all past days including this one. */
  poolCompletedSoFar: number;
  /** Active pool remaining after this day's drain. */
  poolRemaining: number;
  /** $ completed on this specific day (sum of employee contributions). */
  priceCompleted: number;
  /** $ forecasted for this day (sum of employee goalRates). */
  priceForecasted: number;
  /** poolCompletedSoFar / totalPool. */
  percentCompleted: number;
  /** Total pool at season start (static — does not change day to day). */
  totalPool: number;
  /**
   * True if a cascade fired on this day — this group's remaining pool was
   * carried forward into its successor. Only set on the predecessor group.
   */
  cascadedToSuccessor: boolean;
  /** Employees who worked this group on this day. */
  employees: CrawlerDayEmployee[];
  /**
   * daysSince constraint state as of this crawl day.
   * Only present for constrained successor groups (sequences with daysSince > 0).
   * Computed during the future crawl phase using live queue state (including projected completions).
   */
  daysSinceAnalysis?: DaysSinceAnalysis;
};

/**
 * The canonical crawl output for a single day.
 * Replaces PoolDaySnapshot as the authoritative per-day record.
 *
 * Past phase: one CrawlerDay per production day (days with actual work).
 * Present: one CrawlerDay for mainDate (the handoff point).
 * Future phase: one CrawlerDay per simulated weekday until all pools drain.
 *
 * The sequence layer is implicit — derive it by grouping groups by sequenceId.
 * This avoids nesting sequences inside days (a day can have multiple sequences
 * active simultaneously, and a sequence spans many days).
 */
export type CrawlerDay = {
  /** ISO date string. */
  date: string;
  /** Which phase of the crawl produced this snapshot. */
  phase: CrawlerDayPhase;
  /** All groups that had active pool on this day (locked groups excluded). */
  groups: CrawlerDayGroup[];
};
