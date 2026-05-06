import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { CountSizePrice } from "@/app/realGreen/customer/_lib/entities/types/CountSizePrice";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

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
}

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

