/** Which phase of the crawl produced this day's snapshot. */
export type CrawlerDayPhase = "past" | "present" | "future";

/**
 * One employee's contribution to a group on a single crawl day.
 * Past phase: priceCompleted from service.production.doneBys; priceForecasted = 0.
 * Future phase: priceCompleted = drained amount; priceForecasted = goalDailyPrice.
 */
export type CrawlerDayEmployee = {
  employeeId: string;
  /** $ drained from this group's pool by this employee on this day. */
  priceCompleted: number;
  /** This employee's goalDailyPrice for this group (0 in past phase). */
  priceForecasted: number;
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
