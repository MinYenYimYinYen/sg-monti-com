import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CSP } from "@/app/realGreen/customer/_lib/entities/types/CSPTypesAndClass";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

export type PaceCategory =
  | "asap"
  | "overdue"
  | "inProgress"
  | "notStarted"
  | "notSet";

/** A leave or resume event recorded by the cascade simulation for one employee on one servCode. */
export type CascadeTimelineEvent =
  | { kind: "leave"; date: string; toServCodeId: string }
  /**
   * `fromServCodeId`: the servCode the employee was working immediately before resuming here,
   * or null if there was a gap (downtime) with no other servCode winning that interval.
   */
  | { kind: "resume"; date: string; fromServCodeId: string | null };

export type EmployeeCascadeEntry = {
  availableFrom: string | undefined;
  contributedCSP: CSP;
  dailyRate: CSP;
  maxDailyRate: CSP;
  fractionConsumed: CSP | null;
  isEstimated: boolean;
  /**
   * Ordered sequence of leave/resume events for this employee on this servCode.
   * A "leave" event means the employee was pulled off this servCode to work a
   * higher-priority one. A "resume" event means they returned.
   * Empty when there are no interruptions.
   */
  timelineEvents: CascadeTimelineEvent[];
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
  /** Active + asap unscheduled work pool — the stable remaining work not yet on any route sheet. */
  activeAsapCSP: CSP;
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
