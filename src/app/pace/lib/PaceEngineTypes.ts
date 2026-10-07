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

