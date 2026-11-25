import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import {
  buildHoursByWeek,
  HoursByWeekRow,
} from "@/app/timeCard/reports/hoursByWeek";

const selectDateRange = (state: AppState) => state.timeCardReports.dateRange;
const selectPunches = (state: AppState) => state.timeCardReports.punches;

const selectHoursByWeek = createSelector(
  [selectPunches, employeeSelect.employeeMap],
  (punches, employeeMap): HoursByWeekRow[] =>
    buildHoursByWeek({ punches, employeeNames: employeeMap }),
);

export const timeCardReportsSelect = {
  dateRange: selectDateRange,
  punches: selectPunches,
  hoursByWeek: selectHoursByWeek,
};
