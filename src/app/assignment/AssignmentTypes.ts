import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

export type AssignmentDoc = {
  servId: number;
  employeeId: string;
  schedDate: string;
  status: string;
  // sequence added from CSV for the purpose of detecting change to route order.
  // If different than the previous assignment doc for a service, it should nullify the eta.
  // The source of truth for sequence elsewhere in the app is program.tempSeq, direct from RealGreen api.
  sequence: number;
  /** ISO timestamp set server-side when this assignment entry was appended. Used to determine
   *  the canonical (most recent) assignment for a given (servId, schedDate) pair. */
  createdAt: string;
};
export type AssignmentProps = {
  employee: Employee;
};
export type Assignment = AssignmentDoc & AssignmentProps;