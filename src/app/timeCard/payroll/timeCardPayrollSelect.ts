import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TimeCard } from "@/app/timeCard/TimeCard";
import { Punch } from "@/app/timeCard/TimeCardTypes";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

export type EmployeeSummary = {
  employeeId: string;
  employeeName: string;
  nameLastFirst: string;
  punches: Punch[];
  regularMinutes: number;
  overtimeMinutes: number;
  totalMinutes: number;
  minutesByDate: Map<string, number>;
  regularMinutesByDate: Map<string, number>;
  overtimeMinutesByDate: Map<string, number>;
  hasSuspectPunches: boolean;
  hasInvalidPunches: boolean;
  suspectPunches: Punch[];
};

const selectDateRange = (state: AppState) => state.timeCardPayroll.dateRange;
const selectPunches = (state: AppState) => state.timeCardPayroll.punches;

const selectEmployeeSummaries = createSelector(
  [selectPunches, employeeSelect.employeeMap],
  (punches, employeeMap): EmployeeSummary[] => {
    const timeCard = new TimeCard(punches);
    const byEmployee = timeCard.byEmployee;

    const summaries: EmployeeSummary[] = [];
    for (const [employeeId, employeePunches] of byEmployee) {
      const tc = new TimeCard(employeePunches);
      const employee = employeeMap.get(employeeId);
      const employeeName = employee?.name ?? employeeId;
      const nameLastFirst = employee?.nameLastFirst ?? employeeId;

      const regMinutes = tc.regularMinutes;
      const otMinutes = tc.overtimeMinutes;
      const totalMinutes = tc.totalMinutes;
      const minutesByDate = tc.minutesByDate;
      const regularMinutesByDate = tc.regularMinutesByDate;
      const overtimeMinutesByDate = tc.overtimeMinutesByDate;

      summaries.push({
        employeeId,
        employeeName,
        nameLastFirst,
        punches: employeePunches,
        regularMinutes: regMinutes,
        overtimeMinutes: otMinutes,
        totalMinutes,
        minutesByDate,
        regularMinutesByDate,
        overtimeMinutesByDate,
        hasSuspectPunches: tc.hasSuspectPunches,
        hasInvalidPunches: tc.hasInvalidPunches,
        suspectPunches: tc.suspectPunches,
      });
    }

    return summaries.sort((a, b) => a.nameLastFirst.localeCompare(b.nameLastFirst));
  },
);

export const timeCardPayrollSelect = {
  dateRange: selectDateRange,
  punches: selectPunches,
  employeeSummaries: selectEmployeeSummaries,
};
