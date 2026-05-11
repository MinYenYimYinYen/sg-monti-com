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

export type EmployeeShare = {
  employee: Employee;
  // may be brought back differently in the future.
  // shareCSP: CountSizePrice;
  expectedCSP: CountSizePrice | null;
  maxDailyCSP: CountSizePrice | null;
  avgDailyCSP: CountSizePrice | null;
  fractionConsumed: CountSizePrice | null;
  isEstimated: boolean;
};

export type ServCodePace = {
  servCode: ServCodeDeep;
  daysRemaining: number;

  category: PaceCategory;

  unfinishedCSP: CountSizePrice;
  unfinishedRate: CountSizePrice;

  finishedCSP: CountSizePrice;
  finishedRate: CountSizePrice;

  employeeShares: EmployeeShare[];

  teamExpectedCSP: CountSizePrice;
  teamAvgCapacity: CountSizePrice; // sum of employeeShares[].avgDailyCSP — per-programType avg
  paceDelta: CountSizePrice;
  paceDeltaPct: CountSizePrice | null; // null if paceDelta is 0
};

export type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  finishedCSP: CountSizePrice;
};

export type LookbackConfig = {
  lookbackStart: string; // ISO Date
  completionThreshold: number; // percentage of jobs completed in a day
}

export type EmployeeAllocation = {
  servCode: ServCodeDeep;
  fractionConsumed: CountSizePrice | null;
  expectedCSP: CountSizePrice;
  avgDailyCSP: CountSizePrice | null;
}

export type EmployeeCardData = {
  employee: Employee;
  /** Priority-ordered allocations merged across all programTypes */
  allocations: EmployeeAllocation[];
  totalFractionConsumed: CountSizePrice | null;
  freeCapacityFraction: CountSizePrice | null;
  isOverloaded: boolean;
};

export type EmployeePaceSummary = {
  employee: Employee;
  programType: string | null;
  // Per-programType lookback stats (for the detail popover breakdown)
  maxDailyCSP: CountSizePrice | null;
  avgDailyCSP: CountSizePrice | null;
  // Cross-programType totals — both kept for display; avg drives capacity
  totalMaxDailyCSP: CountSizePrice | null;
  totalAvgDailyCSP: CountSizePrice | null;
  allocations: EmployeeAllocation[];
  totalFractionConsumed: CountSizePrice | null;
  freeCapacityFraction: CountSizePrice | null;
  isOverloaded: boolean; // true if any dimension of CSP is > 1.0
}

// Floating-point noise can push a fully-loaded employee just above 1.0.
// Use this epsilon so 100.01% doesn't trigger the overload indicator.
export const OVERLOAD_EPSILON = 0.001;

export type ServCodePaceDelta = {
  servCodeId: string;
  dateRange: TRange<string>;
  /** Projected completion date based on unfinishedPerDay.count. null if no data. */
  projectedEndDate: string | null;
  /** Weekdays between dateRange.max and projectedEndDate. Positive = behind, negative = ahead. null if no data. */
  deltaDays: number | null;
};

