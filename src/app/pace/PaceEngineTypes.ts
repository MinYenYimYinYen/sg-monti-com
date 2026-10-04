import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";

// ---------------------------------------------------------------------------
// Pool history — one snapshot per crawl day
// ---------------------------------------------------------------------------

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
  /** Sum of actionable service prices. */
  activePool: number;
  /** Sum of all non-N service prices. */
  totalPool: number;
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
  /** activePool / teamGoalDailyRate. null if goals missing. */
  daysNeeded: number | null;
  /** Effective working days in [mainDate, plannedEnd]. */
  daysAvailable: number;
  /** daysNeeded - daysAvailable. Positive = late, negative = early. null if goals missing. */
  daysEarlyLate: number | null;
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
// Full engine output
// ---------------------------------------------------------------------------

export type PaceEngineResult = {
  groups: GroupResult[];
  /** O(1) lookup by groupId. */
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
