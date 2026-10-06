import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";
import { CrawlerDay } from "@/app/pace/lib/crawlerDay/CrawlerDay";

// ---------------------------------------------------------------------------
// Pool history — one snapshot per crawl day
// ---------------------------------------------------------------------------

/**
 * Per-employee contribution on a single crawl day.
 * Future phase: populated from simulation drain (which employee drained what).
 * Past phase: populated from service.production.doneBys + doneDate.
 */
export type PoolDaySnapshotEmployeeBreakdown = {
  employeeId: string;
  priceCompleted: number;
  priceForecasted: number;
};

/**
 * A single day's pool snapshot recorded during the crawl.
 * Past phase: populated from actual service completion data.
 * Future phase: populated from the simulation drain.
 * The mainDate entry is the handoff point — actual history to the left,
 * projected trajectory to the right.
 */
export type PoolDaySnapshot = {
  /** ISO date — every day in the crawl span. */
  date: string;
  /** Cumulative $ completed as of this day. */
  completed: number;
  /** Active pool remaining as of this day. */
  remaining: number;
  /** $ completed on this specific day. */
  priceCompleted: number;
  /** $ forecasted for this specific day (goalRate sum of working employees). */
  priceForecasted: number;
  /** Employee IDs who worked this group on this day. */
  employeesWorking: string[];
  /** completedSoFar / totalPool — used to detect cascade-threshold crossings. */
  percentCompleted: number;
  /**
   * Per-employee breakdown for this day.
   * Future phase: populated from simulation drain.
   * Past phase: populated from service.production.doneBys + doneDate.
   * Empty when no per-employee attribution is available.
   */
  employeeBreakdowns: PoolDaySnapshotEmployeeBreakdown[];
};

// ---------------------------------------------------------------------------
// Per-employee breakdown within a group
// ---------------------------------------------------------------------------

export type EmployeeGroupBreakdown = {
  employeeId: string;

  /** Driver: what the simulation uses. null means engine cannot project this group. */
  goalDailyPrice: number | null;

  /** Feedback: what has actually happened on this group (from past crawl). */
  avgDailyPrice: number | null;
  /** How many days of history this avg is based on. */
  avgDaysObserved: number;

  /** This employee's goalDailyPrice / teamGoalDailyRate. */
  shareRatio: number;
  /** activePool * shareRatio / daysAvailable. */
  requiredDailyPrice: number | null;
  /** Employee-level projection: positive = late, negative = early. */
  daysEarlyLate: number | null;
};

// ---------------------------------------------------------------------------
// Per-member result (one per servCode in the group)
// ---------------------------------------------------------------------------

export type MemberResult = {
  servCodeId: string;
  activePool: number;
  plannedEnd: string | null;
  remainingWeekdays: number;
  projectedEndDate: string | null;
  isOverdue: boolean;
};

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
// Per-group result — the core engine output unit
// ---------------------------------------------------------------------------

export type GroupResult = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];

  /** null when this group is not part of any GroupSequence. */
  sequenceId: string | null;

  // --- Plan context (from SeasonPlan) ---
  plannedStart: string | null;
  plannedEnd: string | null;
  /** weekdaysBetween(mainDate, plannedEnd). */
  planDeadlineWeekdays: number;

  // --- Pool state (as of mainDate) ---
  /**
   * @deprecated Post-simulation value — drained to 0 by the future phase projection.
   * Use CrawlerDayUtils.groupPoolRemainingAsOf(crawlerDays, groupId, mainDate) instead.
   */
  activePool: number;
  /** Sum of all non-N service prices. */
  totalPool: number;
  /**
   * @deprecated Derived from post-simulation activePool — may be false even when real work remains.
   * Use CrawlerDayUtils.groupHasWorkAsOf(crawlerDays, groupId, mainDate) instead.
   */
  hasWork: boolean;

  // --- Actual history (from past crawl phase) ---
  /** Total $ completed as of mainDate. */
  actualPriceCompleted: number;
  /** How many past days had any production on this group. */
  actualDaysWorked: number;
  /** Avg team $/day on days this group was worked. null when no history yet. */
  actualTeamDailyRate: number | null;

  // --- Simulation output (from future crawl phase) ---
  /** Day the pool drains to zero. null if goals missing. */
  projectedEndDate: string | null;
  /** Earliest date any employee starts working it. */
  projectedStartDate: string | null;
  /** employeeIds with no goalDailyPrice set. */
  missingGoals: string[];

  // --- Pace analysis (single source of truth) ---
  /** Sum of all assigned employees' goalDailyPrice. */
  teamGoalDailyRate: number;
  /**
   * @deprecated Computed from post-simulation activePool — will be 0 when pool is drained by projection.
   * Recompute using CrawlerDayUtils.groupPoolRemainingAsOf(crawlerDays, groupId, mainDate) / teamGoalDailyRate.
   */
  daysNeeded: number | null;
  /** Effective working days in [mainDate, plannedEnd]. */
  daysAvailable: number;
  /**
   * @deprecated Derived from deprecated daysNeeded — incorrect when activePool is post-simulation.
   * Recompute using correct poolRemaining from CrawlerDayUtils.
   */
  daysEarlyLate: number | null;
  /**
   * @deprecated Derived from deprecated daysEarlyLate — incorrect when activePool is post-simulation.
   * Recompute using correct poolRemaining from CrawlerDayUtils.
   */
  isOnTrack: boolean;
  /** plannedEnd < mainDate AND hasWork. */
  isOverdue: boolean;

  // --- Per-employee breakdown ---
  employeeBreakdowns: EmployeeGroupBreakdown[];

  // --- Timeline (from simulation) ---
  crewTimeline: ServCodeTimelineEvent[];

  // --- Pool history (every crawl day) ---
  poolHistory: PoolDaySnapshot[];

  // --- Per-member detail ---
  members: MemberResult[];
};

// ---------------------------------------------------------------------------
// Sequence result — one per GroupSequence (including synthetic single-member sequences)
// ---------------------------------------------------------------------------

/**
 * The engine's output for one GroupSequence.
 *
 * Synthetic sequences (isSynthetic === true) are auto-generated for standalone groups
 * that are not part of any user-created GroupSequence. They have exactly one member.
 *
 * The UI uses isSynthetic to distinguish:
 * - Assignments panel: shows groups where isSynthetic === true (standalone groups)
 * - Sequences panel: shows sequences where isSynthetic === false (user-created)
 * - Gantt/Burndown: renders all sequences uniformly; omits container styling for synthetic ones
 */
export type SequenceResult = {
  sequenceId: string;
  label: string;
  /** True when auto-generated for a standalone group (groupIds.length === 1). */
  isSynthetic: boolean;
  /** Ordered member GroupResults — index 0 opens first. */
  members: GroupResult[];
  /** Merged pool history across all members (summed by date). */
  poolHistory: PoolDaySnapshot[];
  /** Earliest plannedStart across all members. */
  plannedStart: string | null;
  /** Latest plannedEnd across all members. */
  plannedEnd: string | null;
  /** Earliest projectedStartDate across members with work. */
  projectedStartDate: string | null;
  /** Latest projectedEndDate across all members. */
  projectedEndDate: string | null;
  /** Sum of totalPool across all members. */
  totalPool: number;
  /** True if any member has work remaining. */
  hasWork: boolean;
  /** True if any member is overdue. */
  isOverdue: boolean;
};

// ---------------------------------------------------------------------------
// Full engine output
// ---------------------------------------------------------------------------

export type PaceEngineResult = {
  /**
   * All sequence results — includes synthetic single-member sequences for standalone groups.
   * This is the primary collection for UI consumers (Gantt, Burndown, Season Plan).
   */
  sequenceResults: SequenceResult[];
  /** Map<sequenceId, SequenceResult> for O(1) lookup. */
  sequenceResultMap: Map<string, SequenceResult>;
  /**
   * Map<groupId, GroupResult> for O(1) lookup — all groups including sequence members.
   * Used by consumers that need to resolve a groupId (e.g. priorities, crew timelines).
   */
  groupMap: Map<string, GroupResult>;

  /** Per-employee ordered list of timeline events. */
  employeeTimeline: Map<string, { date: string; event: EmployeeTimelineEvent }[]>;

  /** Groups that need immediate attention. */
  urgentGroups: UrgentGroup[];

  /** Metadata */
  mainDate: string;
  /** Earliest plannedStart across all groups (or snowMelt). */
  seasonStart: string;
  /** snowDeadline (or latest plannedEnd). */
  seasonEnd: string;

  /**
   * Canonical per-day crawl output at day → group → employee granularity.
   * Primary source for burndown, gantt, and timeline consumers.
   * Replaces the per-group poolHistory arrays as the authoritative history.
   * Old poolHistory fields on GroupResult/SequenceResult remain for backward
   * compatibility until all consumers are migrated to CrawlerDayUtils.
   */
  crawlerDays: CrawlerDay[];
};

// ---------------------------------------------------------------------------
// Internal engine types (used by lib/ phase functions)
// ---------------------------------------------------------------------------

/**
 * Resolved context for one group, assembled before the crawl begins.
 * Combines AssignmentGroup + GroupSchedule + AssignmentPlan data.
 */
export type GroupContext = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];
  sequenceId: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  /** employeeId → goalDailyPrice (null = not set). */
  goalsByEmployee: Map<string, number | null>;
  /** Priority-ordered employeeIds assigned to this group. */
  assignedEmployeeIds: string[];
};

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
  poolHistory: PoolDaySnapshot[];
  /**
   * True when plannedEnd < mainDate AND activePool > 0 as of the past phase.
   * Set by crawlPastPhase and never modified by the future phase.
   * Used by assembleGroupResults for isOverdue — poolRemaining may be drained
   * to zero by the future phase even when real work remains as of mainDate.
   */
  overdueAsOfMainDate: boolean;
};

/**
 * Employee availability constraints passed into the engine.
 */
export type EngineEmployeeEntry = {
  employeeId: string;
  availability: EmployeeAvailability;
  /** ISO date strings on which this employee is unavailable (PTO + holidays). */
  timeOffDates: Set<string>;
};
