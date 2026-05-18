import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CSP } from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

/** One row of season optimizer output per servCode. */
export type SeasonOptimizedRange = {
  servCodeId: string;
  progCodeId: string;
  servCodeName: string;
  currentRange: TRange<string>;
  /** Proposed new start — unchanged for non-runsInSequence or already-started servCodes */
  proposedMin: string;
  /** Proposed new end — projectedEndDate + paddingDays, or currentRange.max if no data */
  proposedMax: string;
  projectedEndDate: string | null;
  paddingDays: number;
  runsInSequence: boolean;
  /** True when the servCode's pool has already started (openDate ≤ today) */
  isStarted: boolean;
  /** True when there's unscheduled work and a projected end date exists */
  hasWork: boolean;
};

export type PaceCategory =
  | "asap"
  | "overdue"
  | "inProgress"
  | "notStarted"
  | "notSet";

export type EmployeeCascadeEntry = {
  availableFrom: string | undefined;
  contributedCSP: CSP;
  dailyRate: CSP;
  maxDailyRate: CSP;
  fractionConsumed: CSP | null;
  isEstimated: boolean;
};

export type EmployeeCascadeResult = {
  employee: Employee;
  totalAvgDailyCSP: CSP | null;
  byServCode: Map<string, EmployeeCascadeEntry>;
};

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;
  category: PaceCategory;
  unfinishedCSP: CSP;
  unfinishedRate: CSP;
  finishedCSP: CSP;
  finishedRate: CSP;
  employeeShares: Array<EmployeeCascadeEntry & { employee: Employee }>;
  teamExpectedCSP: CSP;
  teamAvgCapacity: CSP;
  paceDelta: CSP;
  paceDeltaPct: CSP | null;
};

export type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CSP;
  finishedCSP: CSP;
};

export type EmployeeAllocation = {
  servCode: ServCodeDeep;
  fractionConsumed: CSP | null;
  expectedCSP: CSP;
  avgDailyCSP: CSP | null;
  maxDailyCSP: CSP | null;
};

export type EmployeeCardData = {
  employee: Employee;
  totalAvgDailyCSP: CSP | null;
  allocations: EmployeeAllocation[];
  totalFractionConsumed: CSP | null;
  freeCapacityFraction: CSP | null;
};

export type LookbackConfig = {
  lookbackStart: string;
  completionThreshold: number;
};

export const OVERLOAD_EPSILON = 0.001;

export type ServCodePaceDelta = {
  servCodeId: string;
  dateRange: TRange<string>;
  projectedEndDate: string | null;
  deltaDays: number | null;
  deltaDaysCSP: { count: number | null; size: number | null; price: number | null } | null;
};

/** Projected completion date for a ProgCode (latest projected end date across all its servCodes). */
export type ProgCodeProjectedCompletion = {
  /** The projected completion date (ISO date string), or null if no servCodes have data. */
  date: string | null;
  /**
   * True if any servCode in the progCode had no team lookback data and fell back to
   * dateRange.max as its projected end date. Muted styling should be applied when true.
   */
  isEstimated: boolean;
};
