import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { EmployeeDayStatus } from "@/app/pace/routePlanTypes";

// ---------------------------------------------------------------------------
// EmployeeRoutedStatus — cross-module conflict detection
//
// Answers: "On dates where an employee has printed (scheduled) services,
// do they also have PTO or an unplanned absence?"
//
// Consumers:
//   - pace/routePlanSelect  → RoutePlanEmployeeRow conflict chip + row highlight
//   - scheduling/prenotify  → date list conflict badge
// ---------------------------------------------------------------------------

/**
 * The subset of EmployeeDayStatus kinds that represent planned unavailability.
 * A conflict exists when one of these co-occurs with "scheduled" on the same date.
 *
 * - "pto"               → planned dates / planned time — employee requested off
 * - "unplanned-absence" → unplanned absence — employee is unexpectedly out
 * - "holiday"           → company holiday or weather day — services printed in the CRM
 *                         still need to be resolved even though no one should be working
 */
const CONFLICT_ABSENCE_KINDS = new Set<EmployeeDayStatus["kind"]>(["pto", "unplanned-absence", "holiday"]);

export type EmployeeRoutedStatus = {
  employeeId: string;
  date: string;
  /** All statuses that apply to this employee on this date (scheduled + any absences). */
  statuses: EmployeeDayStatus[];
  /** True when the employee is both scheduled for work and has a planned absence. */
  hasConflict: boolean;
};

// ---------------------------------------------------------------------------
// Internal: printed services map — Map<date, Set<employeeId>>
// ---------------------------------------------------------------------------

const selectPrintedEmployeesByDate = createSelector(
  [centralSelect.services],
  (services): Map<string, Set<string>> => {
    const result = new Map<string, Set<string>>();
    for (const service of services) {
      if (service.status !== "$") continue;
      const schedInfo = service.x.schedInfo;
      if (!schedInfo?.schedDate || !schedInfo.employeeId) continue;
      const { schedDate, employeeId } = schedInfo;
      if (!result.has(schedDate)) result.set(schedDate, new Set());
      result.get(schedDate)!.add(employeeId);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Internal: absence dates per employee — Map<employeeId, Map<date, EmployeeDayStatus>>
//
// Only covers "pto" and "unplanned-absence" — the two conflict-relevant kinds.
// ---------------------------------------------------------------------------

const selectAbsenceDatesByEmployee = createSelector(
  [plannedTimeOffSelect.byEmployeeId],
  (byEmployeeId): Map<string, Map<string, EmployeeDayStatus>> => {
    const result = new Map<string, Map<string, EmployeeDayStatus>>();
    for (const [employeeId, ptoList] of byEmployeeId) {
      const dateMap = new Map<string, EmployeeDayStatus>();
      for (const pto of ptoList) {
        const kind: EmployeeDayStatus["kind"] =
          pto.requestType === "unplannedAbsence" ? "unplanned-absence" : "pto";
        let day = pto.dateRange.min;
        while (day <= pto.dateRange.max) {
          if (dateStrings.isWeekDay(day) && !dateMap.has(day)) {
            dateMap.set(day, { kind });
          }
          day = dateStrings.addDays(day, 1);
        }
      }
      if (dateMap.size > 0) result.set(employeeId, dateMap);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Primary selector — Map<date, Map<employeeId, EmployeeRoutedStatus>>
//
// Only covers dates that have at least one printed service. For each such
// date, only employees who are scheduled on that date are included.
// ---------------------------------------------------------------------------

const selectByDateAndEmployee = createSelector(
  [selectPrintedEmployeesByDate, selectAbsenceDatesByEmployee],
  (printedByDate, absencesByEmployee): Map<string, Map<string, EmployeeRoutedStatus>> => {
    const result = new Map<string, Map<string, EmployeeRoutedStatus>>();

    for (const [date, employeeIds] of printedByDate) {
      const byEmployee = new Map<string, EmployeeRoutedStatus>();

      for (const employeeId of employeeIds) {
        // serviceCount/totalPrice/servCodeIds/goalDailyPrice are not tracked here — this selector
        // is about conflict detection only. The pace selector owns the full hydrated status.
        const scheduledStatus: EmployeeDayStatus = { kind: "scheduled", serviceCount: 0, totalPrice: 0, servCodeIds: [], goalDailyPrice: null };
        const statuses: EmployeeDayStatus[] = [scheduledStatus];

        const absenceStatus = absencesByEmployee.get(employeeId)?.get(date);
        if (absenceStatus) {
          statuses.push(absenceStatus);
        }

        const hasConflict =
          statuses.some((s) => CONFLICT_ABSENCE_KINDS.has(s.kind)) &&
          statuses.some((s) => s.kind === "scheduled");

        byEmployee.set(employeeId, { employeeId, date, statuses, hasConflict });
      }

      result.set(date, byEmployee);
    }

    return result;
  },
);

// ---------------------------------------------------------------------------
// Derived: conflict dates — Set<date> where any employee has a conflict
// ---------------------------------------------------------------------------

const selectConflictDates = createSelector(
  [selectByDateAndEmployee],
  (byDateAndEmployee): Set<string> => {
    const result = new Set<string>();
    for (const [date, byEmployee] of byDateAndEmployee) {
      for (const entry of byEmployee.values()) {
        if (entry.hasConflict) {
          result.add(date);
          break;
        }
      }
    }
    return result;
  },
);

export const employeeRoutedStatusSelect = {
  /** Map<date, Map<employeeId, EmployeeRoutedStatus>> — scheduled dates only. */
  byDateAndEmployee: selectByDateAndEmployee,
  /** Set of dates where at least one employee has a scheduling conflict. */
  conflictDates: selectConflictDates,
};
