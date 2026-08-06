import {
  Employee,
  EmployeeDoc,
  EmployeeDocProps,
  EmployeeProps,
} from "@/app/realGreen/employee/types/EmployeeTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

export const baseEmployeeDocProps: EmployeeDocProps = {
  employeeId: baseStrId,
  phone: "",
  createdAt: "",
  updatedAt: "",
};

export const baseEmployeeDoc: EmployeeDoc = {
  ...baseEmployeeDocProps,
  active: true,
  email: "",
  name: "",
};

const baseEmployeeProps: EmployeeProps = {
  servCodeIds: [],
  plannedTimeOff: [] as PlannedTimeOff[],
};

export const baseEmployee: Employee = {
  ...baseEmployeeDoc,
  ...baseEmployeeProps,
};
