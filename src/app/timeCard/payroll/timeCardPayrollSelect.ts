import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { TimeCard } from "@/app/timeCard/TimeCard";
import { Punch } from "@/app/timeCard/TimeCardTypes";

export type EmployeeSummary = {
  employeeId: string;
  punches: Punch[];
  regularMinutes: number;
  overtimeMinutes: number;
  totalMinutes: number;
  minutesByDate: Map<string, number>;
  hasSuspectPunches: boolean;
  hasInvalidPunches: boolean;
  suspectPunches: Punch[];
};

const selectDateRange = (state: AppState) => state.timeCardPayroll.dateRange;
const selectPunches = (state: AppState) => state.timeCardPayroll.punches;

const selectEmployeeSummaries = createSelector(
  [selectPunches],
  (punches): EmployeeSummary[] => {
    const timeCard = new TimeCard(punches);
    const byEmployee = timeCard.byEmployee;

    const summaries: EmployeeSummary[] = [];
    for (const [employeeId, employeePunches] of byEmployee) {
      const tc = new TimeCard(employeePunches);
      summaries.push({
        employeeId,
        punches: employeePunches,
        regularMinutes: tc.regularMinutes,
        overtimeMinutes: tc.overtimeMinutes,
        totalMinutes: tc.totalMinutes,
        minutesByDate: tc.minutesByDate,
        hasSuspectPunches: tc.hasSuspectPunches,
        hasInvalidPunches: tc.hasInvalidPunches,
        suspectPunches: tc.suspectPunches,
      });
    }

    return summaries.sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  },
);

export const timeCardPayrollSelect = {
  dateRange: selectDateRange,
  punches: selectPunches,
  employeeSummaries: selectEmployeeSummaries,
};
