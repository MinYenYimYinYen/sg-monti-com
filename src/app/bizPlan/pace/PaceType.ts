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
  shareCSP: CountSizePrice;
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
};

export type ProgCodePace = {
  progCode: ProgCode;
  servCodePaces: ServCodePace[];
  category: PaceCategory;
  unfinishedCSP: CountSizePrice;
  finishedCSP: CountSizePrice;
};
