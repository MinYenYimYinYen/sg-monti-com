import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

export type PaceCategory =
  | "asap"
  | "overdue"
  | "inProgress"
  | "notStarted"
  | "notSet";

export type EmployeeCascadeEntry = {
  availableFrom: string | undefined;
  contributedCSP: CountSizePrice;
  dailyRate: CountSizePrice;
  maxDailyRate: CountSizePrice;
  fractionConsumed: CountSizePrice | null;
  isEstimated: boolean;
};

export type EmployeeCascadeResult = {
  employee: Employee;
  totalAvgDailyCSP: CountSizePrice | null;
  byServCode: Map<string, EmployeeCascadeEntry>;
};

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;
  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;
  employeeShares: Array<EmployeeCascadeEntry & { employee: Employee }>;
  teamExpectedCSP: CountSizePrice;
  teamAvgCapacity: CountSizePrice;
  paceDelta: CountSizePrice;
  paceDeltaPct: CountSizePrice | null;
};

export type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  finishedCSP: CountSizePrice;
};

export type EmployeeAllocation = {
  servCode: ServCodeDeep;
  fractionConsumed: CountSizePrice | null;
  expectedCSP: CountSizePrice;
  avgDailyCSP: CountSizePrice | null;
  maxDailyCSP: CountSizePrice | null;
};

export type EmployeeCardData = {
  employee: Employee;
  totalAvgDailyCSP: CountSizePrice | null;
  allocations: EmployeeAllocation[];
  totalFractionConsumed: CountSizePrice | null;
  freeCapacityFraction: CountSizePrice | null;
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
