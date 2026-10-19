import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import {
  EmployeeDayStatus,
  EmployeeDayStatuses,
  RoutePlanDay,
  RoutePlanEmployee,
} from "@/app/pace/routePlanTypes";
import { CrawlerDayPhase } from "@/app/pace/lib/crawlerDay/CrawlerDay";

const selectQueuedPriceByDateAndEmployee = (state: AppState): Record<string, Record<string, number>> =>
  state.pace.queuedPriceByDateAndEmployee;

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
// Printed services map — Map<date, Map<employeeId, PrintedEntry>>
//
// Built from centralSelect.services filtered to status === "$" (printed).
// Uses service.x.schedInfo (which reads assignments.mostRecent) for the
// canonical schedDate and employeeId — the same source coverSheetsSelect uses.
// ---------------------------------------------------------------------------

type PrintedEntry = { serviceCount: number; totalPrice: number; servCodeIds: string[] };

const selectPrintedServicesByDateAndEmployee = createSelector(
  [centralSelect.services],
  (services): Map<string, Map<string, PrintedEntry>> => {
    const result = new Map<string, Map<string, PrintedEntry>>();
    for (const service of services) {
      if (service.status !== "$") continue;
      const schedInfo = service.x.schedInfo;
      if (!schedInfo?.schedDate || !schedInfo.employeeId) continue;
      const { schedDate, employeeId } = schedInfo;
      if (!result.has(schedDate)) result.set(schedDate, new Map());
      const byEmployee = result.get(schedDate)!;
      const existing = byEmployee.get(employeeId);
      if (existing) {
        existing.serviceCount += 1;
        existing.totalPrice += service.price;
        if (!existing.servCodeIds.includes(service.servCodeId)) {
          existing.servCodeIds.push(service.servCodeId);
        }
      } else {
        byEmployee.set(employeeId, {
          serviceCount: 1,
          totalPrice: service.price,
          servCodeIds: [service.servCodeId],
        });
      }
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

      // Build the employee list for this date:
      //   - All employees in the active assignment plan (the normal case).
      //   - PLUS any employees who have printed services on this date but are NOT in the
      //     plan. This surfaces the "scheduled but not tracked" conflict (e.g. an employee
      //     who was removed from the plan but still has routed work in the CRM).
      const employeesForDate = [...plannedEmployees];
      if (printedForDate) {
        for (const scheduledEmployeeId of printedForDate.keys()) {
          if (!assignmentsByEmployeeId.has(scheduledEmployeeId)) {
            const employee = employees.find((e) => e.employeeId === scheduledEmployeeId);
            if (employee) employeesForDate.push(employee);
          }
        }
        // Re-sort after any additions to keep alphabetical order.
        employeesForDate.sort((a, b) => a.name.localeCompare(b.name));
      }

      const routeEmployees: RoutePlanEmployee[] = employeesForDate.map((employee): RoutePlanEmployee => {
        const { employeeId } = employee;

        const isUnplannedAbsent = unplannedAbsenceDatesByEmployee.get(employeeId)?.has(date) ?? false;
        const isPto = !isUnplannedAbsent && employee.timeOffDates.has(date);
        const isScheduled = printedForDate?.has(employeeId) ?? false;

        // Build the statuses array. Normally one entry; two entries when there's a conflict.
        // A conflict is: employee has printed services AND has a planned absence (PTO or unplanned).
        // In that case we include both the absence status and the scheduled status so the UI
        // can render both chips and highlight the row.
        const statuses: EmployeeDayStatuses = [];

        // Helper to build a "scheduled" status from the printed entry for this employee.
        const buildScheduledStatus = (): EmployeeDayStatus => {
          const p = printedForDate!.get(employeeId)!;
          // Look up the employee's goal for the day from the assignment plan.
          // We use the first group assignment's dailyRevenueGoal as the goal proxy,
          // since scheduled employees don't have a projected groupId to key off of.
          const plan = assignmentsByEmployeeId.get(employeeId);
          const goalDailyPrice = plan?.groupAssignments[0]?.dailyRevenueGoal ?? null;
          return { kind: "scheduled", serviceCount: p.serviceCount, totalPrice: p.totalPrice, servCodeIds: p.servCodeIds, goalDailyPrice };
        };

        if (isHoliday) {
          // Always record the holiday status. If the employee also has printed services,
          // both statuses are included so hasSchedulingConflict() fires and the row is
          // highlighted. The "holiday" chip is suppressed in the UI (the card header
          // already shows the holiday/weather banner), so only the "scheduled" chip renders.
          statuses.push({ kind: "holiday" });
          if (isScheduled) {
            statuses.push(buildScheduledStatus());
          }
        } else if (isUnplannedAbsent) {
          statuses.push({ kind: "unplanned-absence" });
          if (isScheduled) {
            statuses.push(buildScheduledStatus());
          }
        } else if (isPto) {
          statuses.push({ kind: "pto" });
          if (isScheduled) {
            statuses.push(buildScheduledStatus());
          }
        } else if (employee.availability.startDate && date < employee.availability.startDate) {
          statuses.push({ kind: "not-started" });
        } else if (employee.availability.endDate && date > employee.availability.endDate) {
          statuses.push({ kind: "done" });
        } else if (isPast && completedForDate?.has(employeeId)) {
          const entry = completedForDate.get(employeeId)!;
          statuses.push({ kind: "completed", totalPrice: entry.totalPrice, servCodeIds: entry.servCodeIds });
        } else if (isScheduled) {
          statuses.push(buildScheduledStatus());
        } else if (projectedForDate?.has(employeeId)) {
          const projected = projectedForDate.get(employeeId)!;
          const plan = assignmentsByEmployeeId.get(employeeId);
          const goalDailyPrice =
            plan?.groupAssignments.find((ga) => ga.groupId === projected.groupId)?.dailyRevenueGoal ?? null;
          statuses.push({ kind: "projected", groupLabel: projected.groupLabel, goalDailyPrice });
        } else {
          statuses.push({ kind: "available" });
        }

        return { employeeId, name: employee.name, statuses };
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

// ---------------------------------------------------------------------------
// Day totals selector — Map<date, { totalGoalPrice: number; totalQueuedPrice: number }>
//
// Goal: sum of goalDailyPrice for every employee on the day (projected + scheduled).
// Queued: sum of already-scheduled totalPrice + manually entered queuedPrice for
//         all other employees. Together these let the manager compare what's targeted
//         vs what's actually in or headed to the CRM.
// ---------------------------------------------------------------------------

type DayTotals = { totalGoalPrice: number; totalQueuedPrice: number };

const selectRoutePlanDayTotals = createSelector(
  [selectRoutePlanDays, selectQueuedPriceByDateAndEmployee],
  (routePlanDays, queuedPriceByDateAndEmployee): Map<string, DayTotals> => {
    const result = new Map<string, DayTotals>();
    for (const day of routePlanDays) {
      let totalGoalPrice = 0;
      let totalQueuedPrice = 0;
      const queuedPriceForDate = queuedPriceByDateAndEmployee[day.date] ?? {};

      for (const employee of day.employees) {
        for (const status of employee.statuses) {
          if (status.kind === "projected") {
            totalGoalPrice += status.goalDailyPrice ?? 0;
            totalQueuedPrice += queuedPriceForDate[employee.employeeId] ?? 0;
          } else if (status.kind === "scheduled") {
            totalGoalPrice += status.goalDailyPrice ?? 0;
            // Scheduled employees already have work in the CRM — count their printed price.
            totalQueuedPrice += status.totalPrice;
          }
        }
      }

      result.set(day.date, { totalGoalPrice, totalQueuedPrice });
    }
    return result;
  },
);

export const routePlanSelect = {
  routePlanDays: selectRoutePlanDays,
  routePlanDayTotals: selectRoutePlanDayTotals,
};
