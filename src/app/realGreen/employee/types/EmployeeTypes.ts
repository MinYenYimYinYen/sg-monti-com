import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type EmployeeRaw = {
  id: string;
  name?: string;
  email?: string;
  position?: string;
  department?: string;
  dateOfBirth?: string;
  dateOfHire?: string;
  dateOfTermination?: string;
  comments?: string;
  active: boolean;
  applicatorLicenseNumber?: string;
  employeeNumber?: string;
  companyID?: number;
};

export type EmployeeCore = {
  employeeId: string;
  name: string;
  email: string;
  active: boolean;
};

export type EmployeeDocProps = CreatedUpdated & {
  employeeId: string;
  phone: string;
};

export type EmployeeDoc = EmployeeDocProps & EmployeeCore;

export type EmployeeProps = {
  /** Priority-ordered servCode IDs from AssignmentPlan — first = highest priority */
  servCodeIds: string[];
};

export type Employee = EmployeeProps & EmployeeDoc;
