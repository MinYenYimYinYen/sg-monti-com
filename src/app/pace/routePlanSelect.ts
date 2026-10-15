import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { EmployeeDayStatus, RoutePlanDay, RoutePlanEmployee } from "@/app/pace/routePlanTypes";
import { CrawlerDayPhase } from "@/app/pace/lib/crawlerDay/CrawlerDay";

const selectMainDate = (state: AppState): string => state.pace.mainDate;

// ---------------------------------------------------------------------------
// Week-aligned date generation helpers
//
// Always shows Mon–Fri of the calendar week containing mainDate (week 1)
// and Mon–Fri of the following calendar week (week 2).
// ---------------------------------------------------------------------------

/** Returns the Monday of the calendar week containing the given ISO date. */
function getMondayOfWeek(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = day === 0 ? -6 : 1 - day;
  return dateStrings.addDays(date, daysToMonday);
}

/** Returns the 5 weekdays (Mon–Fri) of the calendar week starting at the given Monday. */
function weekdaysFromMonday(monday: string): string[] {
  return [0, 1, 2, 3, 4].map((offset) => dateStrings.addDays(monday, offset));
}

// ---------------------------------------------------------------------------
// Printed services map — Map<date, Map<employeeId, serviceCount>>
//
// Built from centralSelect.services filtered to status === "$" (printed).
// Uses service.x.schedInfo (which reads assignments.mostRecent) for the
// canonical schedDate and employeeId — the same source coverSheetsSelect uses.
// ---------------------------------------------------------------------------

const selectPrintedServicesByDateAndEmployee = createSelector(
  [centralSelect.services],
  (services): Map<string, Map<string, number>> => {
    const result = new Map<string, Map<string, number>>();
    for (const service of services) {
      if (service.status !== "$") continue;
      const schedInfo = service.x.schedInfo;
      if (!schedInfo?.schedDate || !schedInfo.employeeId) continue;
      const { schedDate, employeeId } = schedInfo;
      if (!result.has(schedDate)) result.set(schedDate, new Map());
      const byEmployee = result.get(schedDate)!;
      byEmployee.set(employeeId, (byEmployee.get(employeeId) ?? 0) + 1);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Completed production map — Map<date, Map<employeeId, { totalPrice, servCodeIds }>>
//
// Built from centralSelect.services filtered to status === "S" (completed).
// Uses production.doneDate and production.doneBys for attribution.
// servCodeId comes directly from service.servCodeId.
// ---------------------------------------------------------------------------

type CompletedEntry = { totalPrice: number; servCodeIds: string[] };

const selectCompletedByDateAndEmployee = createSelector(
  [centralSelect.services],
  (services): Map<string, Map<string, CompletedEntry>> => {
    const result = new Map<string, Map<string, CompletedEntry>>();
    for (const service of services) {
      if (service.status !== "S" || !service.production) continue;
      const doneDate = service.production.doneDate;
      if (!doneDate) continue;

      const { doneBys } = service.production;
      const employeeIds =
        doneBys.length > 0
          ? doneBys.map((db) => db.employeeId).filter(Boolean)
          : ["_team"];

      for (const employeeId of employeeIds) {
        if (!result.has(doneDate)) result.set(doneDate, new Map());
        const byEmployee = result.get(doneDate)!;
        const existing = byEmployee.get(employeeId);
        if (existing) {
          existing.totalPrice += service.price;
          if (!existing.servCodeIds.includes(service.servCodeId)) {
            existing.servCodeIds.push(service.servCodeId);
          }
        } else {
          byEmployee.set(employeeId, {
            totalPrice: service.price,
            servCodeIds: [service.servCodeId],
          });
        }
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Projected employees per date — Map<date, Map<employeeId, { groupId, groupLabel }>>
//
// Derived from future-phase crawlerDays. Each CrawlerDayGroup.employees entry
// tells us which employee the engine projects working that group on that day.
// groupId is stored so the selector can look up the employee's goal rate.
// ---------------------------------------------------------------------------

type ProjectedEntry = { groupId: string; groupLabel: string };

const selectProjectedByDateAndEmployee = createSelector(
  [paceEngineSelect.crawlerDays],
  (crawlerDays): Map<string, Map<string, ProjectedEntry>> => {
    const result = new Map<string, Map<string, ProjectedEntry>>();
    for (const day of crawlerDays) {
      if (day.phase !== "future") continue;
      for (const group of day.groups) {
        for (const emp of group.employees) {
          if (!result.has(day.date)) result.set(day.date, new Map());
          // First group encountered for this employee on this day wins.
          if (!result.get(day.date)!.has(emp.employeeId)) {
            result.get(day.date)!.set(emp.employeeId, { groupId: group.groupId, groupLabel: group.label });
          }
        }
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Weather day dates — subset of holiday dates flagged as weather events
// ---------------------------------------------------------------------------

const selectWeatherDayDates = holidaySelect.weatherDayDates;

// ---------------------------------------------------------------------------
// Holiday description map — Map<date, description>
// ---------------------------------------------------------------------------

const selectHolidayDescriptionByDate = createSelector(
  [holidaySelect.all],
  (holidays): Map<string, string> => {
    const result = new Map<string, string>();
    for (const holiday of holidays) {
      let day = holiday.dateRange.min;
      while (day <= holiday.dateRange.max) {
        if (dateStrings.isWeekDay(day) && !result.has(day)) {
          result.set(day, holiday.description);
        }
        day = dateStrings.addDays(day, 1);
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Unplanned absence dates per employee — Map<employeeId, Set<date>>
//
// Derived from plannedTimeOffSelect.byEmployeeId, filtering to
// requestType === "unplannedAbsence". Expands dateRanges to individual weekdays.
// ---------------------------------------------------------------------------

const selectUnplannedAbsenceDatesByEmployee = createSelector(
  [plannedTimeOffSelect.byEmployeeId],
  (byEmployeeId): Map<string, Set<string>> => {
    const result = new Map<string, Set<string>>();
    for (const [employeeId, ptoList] of byEmployeeId) {
      const unplannedDates = new Set<string>();
      for (const pto of ptoList) {
        if (pto.requestType !== "unplannedAbsence") continue;
        let day = pto.dateRange.min;
        while (day <= pto.dateRange.max) {
          if (dateStrings.isWeekDay(day)) unplannedDates.add(day);
          day = dateStrings.addDays(day, 1);
        }
      }
      if (unplannedDates.size > 0) result.set(employeeId, unplannedDates);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Main selector — RoutePlanDay[] for 2 calendar weeks (10 weekdays)
// ---------------------------------------------------------------------------

const selectRoutePlanDays = createSelector(
  [
    selectMainDate,
    employeeSelect.employees,
    assignmentPlanSelect.assignmentsByEmployeeId,
    holidaySelect.holidayDates,
    selectWeatherDayDates,
    selectHolidayDescriptionByDate,
    selectPrintedServicesByDateAndEmployee,
    selectCompletedByDateAndEmployee,
    selectProjectedByDateAndEmployee,
    selectUnplannedAbsenceDatesByEmployee,
    paceEngineSelect.crawlerDays,
  ],
  (
    mainDate,
    employees,
    assignmentsByEmployeeId,
    holidayDates,
    weatherDayDates,
    holidayDescriptionByDate,
    printedByDateAndEmployee,
    completedByDateAndEmployee,
    projectedByDateAndEmployee,
    unplannedAbsenceDatesByEmployee,
    crawlerDays,
  ): RoutePlanDay[] => {
    // Build the set of employees who have an active assignment plan, sorted alphabetically.
    const plannedEmployees = employees
      .filter((e) => assignmentsByEmployeeId.has(e.employeeId))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Build a quick lookup for phase by date from crawlerDays.
    const phaseByDate = new Map<string, CrawlerDayPhase>();
    for (const day of crawlerDays) {
      phaseByDate.set(day.date, day.phase);
    }

    // Generate 2 calendar weeks: Mon–Fri of current week + Mon–Fri of next week.
    const currentMonday = getMondayOfWeek(mainDate);
    const nextMonday = dateStrings.addDays(currentMonday, 7);
    const dates = [...weekdaysFromMonday(currentMonday), ...weekdaysFromMonday(nextMonday)];

    return dates.map((date): RoutePlanDay => {
      const isHoliday = holidayDates.has(date);
      const isWeatherDay = weatherDayDates.has(date);
      const holidayDescription = holidayDescriptionByDate.get(date) ?? null;
      const isPast = date < mainDate;

      // Determine phase: use crawlerDays if available, otherwise infer from mainDate.
      const phase: CrawlerDayPhase =
        phaseByDate.get(date) ?? (isPast ? "past" : date === mainDate ? "present" : "future");

      const printedForDate = printedByDateAndEmployee.get(date);
      const completedForDate = completedByDateAndEmployee.get(date);
      const projectedForDate = projectedByDateAndEmployee.get(date);

      const routeEmployees: RoutePlanEmployee[] = plannedEmployees.map((employee): RoutePlanEmployee => {
        const { employeeId } = employee;
        let status: EmployeeDayStatus;

        if (isHoliday) {
          status = { kind: "holiday" };
        } else if (unplannedAbsenceDatesByEmployee.get(employeeId)?.has(date)) {
          status = { kind: "unplanned-absence" };
        } else if (employee.timeOffDates.has(date)) {
          // timeOffDates includes all PTO types; unplanned-absence already handled above.
          status = { kind: "pto" };
        } else if (employee.availability.startDate && date < employee.availability.startDate) {
          status = { kind: "not-started" };
        } else if (employee.availability.endDate && date > employee.availability.endDate) {
          status = { kind: "done" };
        } else if (isPast && completedForDate?.has(employeeId)) {
          const entry = completedForDate.get(employeeId)!;
          status = { kind: "completed", totalPrice: entry.totalPrice, servCodeIds: entry.servCodeIds };
        } else if (printedForDate?.has(employeeId)) {
          status = { kind: "scheduled", serviceCount: printedForDate.get(employeeId)! };
        } else if (projectedForDate?.has(employeeId)) {
          const projected = projectedForDate.get(employeeId)!;
          const plan = assignmentsByEmployeeId.get(employeeId);
          const goalDailyPrice =
            plan?.groupAssignments.find((ga) => ga.groupId === projected.groupId)?.dailyRevenueGoal ?? null;
          status = { kind: "projected", groupLabel: projected.groupLabel, goalDailyPrice };
        } else {
          status = { kind: "available" };
        }

        return { employeeId, name: employee.name, status };
      });

      return {
        date,
        phase,
        isHoliday,
        isWeatherDay,
        holidayDescription,
        employees: routeEmployees,
      };
    });
  },
);

export const routePlanSelect = {
  routePlanDays: selectRoutePlanDays,
};
