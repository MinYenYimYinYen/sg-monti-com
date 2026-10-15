import { CrawlerDay } from "@/app/pace/lib/crawlerDay/CrawlerDay";

// ---------------------------------------------------------------------------
// Urgency classification
// ---------------------------------------------------------------------------

/**
 * Why a group appears in the urgent list.
 *
 * Priority (checked in order — a group matches exactly one):
 *   1. "overdue" — plannedEnd is in the past AND hasWork
 *   2. "unplanned" — has work remaining but no plannedEnd in the active SeasonPlan
 *
 * alwaysAsap servCodes are excluded from the engine entirely and handled
 * independently by the Priorities page via deepSelect.servCodes.
 */
export type UrgencyReason =
  | { kind: "overdue"; deadline: string }
  | { kind: "unplanned" };

export type UrgentGroup = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];
  reason: UrgencyReason;
};

// ---------------------------------------------------------------------------
// Timeline events
// ---------------------------------------------------------------------------

export type EmployeeTimelineEvent =
  | { kind: "starts"; groupId: string; fromGroupId: string | null }
  | { kind: "finishes"; groupId: string }
  | { kind: "switches"; fromGroupId: string; toGroupId: string }
  | { kind: "downtime" };

export type ServCodeTimelineEvent = {
  date: string;
  employeeId: string;
  kind: "starts" | "leaves" | "returns" | "finishes";
  toGroupId?: string;
  fromGroupId?: string;
  employeeDailyRate: number;
  teamDailyRate: number;
  poolRemaining: number;
};

// ---------------------------------------------------------------------------
// Sequence timing statistics
// ---------------------------------------------------------------------------

/**
 * Per-service timing entry for a constrained successor group.
 *
 * `elapsedDays` is the number of calendar days between the predecessor's
 * completion date and the reference date (successor doneDate for past,
 * mainDate for future). null when the predecessor has not yet been completed.
 *
 * `isLocked`:
 *   - Past phase: true when the successor was worked before daysSince elapsed
 *     (constraint was violated — worked too soon).
 *   - Future phase: true when the successor cannot be worked yet as of mainDate
 *     (elapsedDays < daysSince, or predecessor not yet done).
 */
export type ServiceTimingEntry = {
  servId: number;
  progId: number;
  elapsedDays: number | null;
  isLocked: boolean;
};

/**
 * daysSince distribution snapshot for a single crawl date.
 *
 * Captures how many services in the successor group are available, locked, or
 * waiting for their predecessor — and the quartile distribution of elapsed days
 * for services whose predecessor IS done — as of a specific date.
 *
 * Used to show how the constraint evolves over the crawl timeline.
 */
export type DailyTimingSnapshot = {
  date: string;
  /** Services whose predecessor is done AND elapsedDays >= daysSince (unlocked). */
  countAvailable: number;
  /** Services whose predecessor is done BUT elapsedDays < daysSince (still locked). */
  countLocked: number;
  /** Services whose predecessor has not yet been completed as of this date. */
  countPredecessorNotDone: number;
  /** Median elapsed days (over services with predecessor done). null if no data. */
  median: number | null;
  /** 25th percentile elapsed days. null if fewer than 4 data points. */
  q1: number | null;
  /** 75th percentile elapsed days. null if fewer than 4 data points. */
  q3: number | null;
};

/**
 * Aggregate daysSince statistics for one constrained successor group.
 *
 * Produced for both past (completed successor services) and future (active/printed
 * successor services) so the UI can show the full picture side by side.
 *
 * Quartile stats are computed only over services where the predecessor IS done
 * (elapsedDays !== null), since null entries have no meaningful elapsed time.
 */
export type SequenceTimingStats = {
  sequenceId: string;
  /** The successor group these stats describe. */
  groupId: string;
  /** The required minimum gap (calendar days). */
  daysSince: number;
  /** "past" = completed successor services; "future" = active/printed successor services. */
  phase: "past" | "future";
  services: ServiceTimingEntry[];
  /** Total services in this phase for this group. */
  count: number;
  /**
   * Past: services worked before daysSince elapsed (constraint violated).
   * Future: services not yet unlocked as of mainDate.
   */
  countLocked: number;
  /**
   * Past: services worked on time (elapsedDays >= daysSince).
   * Future: services ready to work now (elapsedDays >= daysSince).
   */
  countAvailable: number;
  /** Services whose predecessor has not yet been completed. */
  countPredecessorNotDone: number;
  /** Median elapsed days (over services with elapsedDays !== null). null if no data. */
  median: number | null;
  /** Mean elapsed days (over services with elapsedDays !== null). null if no data. */
  mean: number | null;
  /** 25th percentile elapsed days. null if fewer than 4 data points. */
  q1: number | null;
  /** 75th percentile elapsed days. null if fewer than 4 data points. */
  q3: number | null;
  /**
   * Per-date snapshots of the daysSince distribution across the crawl timeline.
   * One entry per crawl day (past and future). Allows the UI to show how the
   * constraint evolves — how many services unlock each day and what the
   * elapsed-days quartiles look like at each point in time.
   */
  dailySnapshots: DailyTimingSnapshot[];
};

// ---------------------------------------------------------------------------
// Full engine output
// ---------------------------------------------------------------------------

export type PaceEngineResult = {
  /** Groups that need immediate attention. */
  urgentGroups: UrgentGroup[];

  /**
   * Canonical per-day crawl output at day → group → employee granularity.
   * Primary source for burndown, gantt, and timeline consumers.
   */
  crawlerDays: CrawlerDay[];

  /**
   * daysSince timing statistics for each constrained successor group.
   * One entry per (groupId, phase) pair — both "past" and "future" for each group.
   */
  sequenceTimingStats: SequenceTimingStats[];
};

// ---------------------------------------------------------------------------
// Internal engine types (used by lib/ phase functions)
// ---------------------------------------------------------------------------

/**
 * Mutable pool state for one group during the crawl.
 */
export type GroupPoolState = {
  groupId: string;
  /** Current remaining pool (drains during future phase). */
  poolRemaining: number;
  /** Total pool at crawl start (completed + remaining). */
  totalPool: number;
  /** Cumulative completed as of the current crawl day. */
  completedSoFar: number;
  /** Days on which any production occurred (for avgDailyRate). */
  productionDays: number;
  /** Sum of all production on production days (for avgDailyRate). */
  productionSum: number;
  projectedEndDate: string | null;
  projectedStartDate: string | null;
  overdueAsOfMainDate: boolean;
};

