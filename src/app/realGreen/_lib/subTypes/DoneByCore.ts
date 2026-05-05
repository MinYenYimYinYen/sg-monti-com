import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

export type DoneByRaw = {
  created?: string;
  /**
   * @deprecated use 'service.doneDate' instead. doneDate is always null as of 2024-12-06
   * */
  doneDate?: string;
  employeeID: string | null;
  employeeName: string | null;
  endTime?: number;
  id: number;
  percent: number | null;
  serviceID: number;
  starTime?: number;
  updated?: string;
};

export type DoneByCore = {
  doneById: number;
  employeeId: string;
  servId: number;
  percent: number;
};

export type DoneByProps = {
  employee: Employee
};

export type DoneBy = DoneByCore & DoneByProps;

function remapDoneBy(raw: DoneByRaw): DoneByCore {
  // RealGreen stores percent as an integer (0–100); normalize to fraction (0.0–1.0).
  // Default to 100 (full credit) when percent is missing.
  return {
    doneById: raw.id,
    employeeId: raw.employeeID || "",
    percent: (raw.percent ?? 100) / 100,
    servId: raw.serviceID,
  };
}

export function remapDoneBys (raw: DoneByRaw[]): DoneByCore[] {
  return raw.map((r) => remapDoneBy(r));
}
