import {
  Employee,
  EmployeeDoc,
  EmployeeDocProps,
  EmployeeProps,
} from "@/app/realGreen/employee/types/EmployeeTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

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

const baseEmployeeProps: EmployeeProps = {};

export const baseEmployee: Employee = {
  ...baseEmployeeDoc,
  ...baseEmployeeProps,
};
