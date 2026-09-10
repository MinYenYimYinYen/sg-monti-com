import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { plannedTimeOffSelect } from "@/app/plannedTimeOff/plannedTimeOffSelect";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";

// ---------------------------------------------------------------------------
// SuspiciousZeroDay — a day where an employee had assignments but completed
// nothing, with no recorded absence, while other employees did work.
// ---------------------------------------------------------------------------

export type SuspiciousZeroDay = {
  date: string;
  /** Number of services assigned to this employee on this date. */
  assignedCount: number;
  /** How many of those assigned services had a call-ahead. */
  callAheadsAffected: number;
};

// ---------------------------------------------------------------------------
// ReliabilityMetrics — per-employee reliability breakdown.
// ---------------------------------------------------------------------------

export type ReliabilityMetrics = {
  /** Actual completion pct (0–1). null when no assignments exist. */
  actualCompletionPct: number | null;
  /** Raw fraction for actual completion: { completed, assigned }. null when no assignments exist. */
  actualCompletionFraction: { completed: number; assigned: number } | null;
  /**
   * Hypothetical completion pct (0–1) assuming the employee completed every
   * assigned job on days they called in sick. null when no assignments exist.
   */
  hypotheticalCompletionPct: number | null;
  /** Raw fraction for hypothetical completion: { completed, assigned }. null when no assignments exist. */
  hypotheticalCompletionFraction: { completed: number; assigned: number } | null;
  /**
   * How much unplanned absences dragged down the completion pct (0–1).
   * hypotheticalCompletionPct - actualCompletionPct. null when either is null.
   */
  absenceImpactPct: number | null;
  /** Number of unplanned absence events recorded in the date range. */
  unplannedAbsenceCount: number;
  /**
   * Number of services assigned on absence days that had a call-ahead
   * (service.x.hasCallAhead). These are the customers who were pre-notified
   * and then the employee didn't show.
   */
  callAheadsAffected: number;
  /** Total number of services assigned on absence days (the missed workload). */
  servicesHitByAbsences: number;
  /**
   * Days where the employee had assignments, completed nothing, has no recorded
   * absence, and at least one other employee did complete work (rain-day filter).
   * These are candidates for an unrecorded unplanned absence.
   */
  suspiciousZeroDays: SuspiciousZeroDay[];
};

// ---------------------------------------------------------------------------
// Source selectors
// ---------------------------------------------------------------------------

const selectDoneDateRange = (state: AppState) => state.productivity.doneDateRange;

// ---------------------------------------------------------------------------
// Unplanned absences within the productivity date range, grouped by employee
// ---------------------------------------------------------------------------

const selectUnplannedAbsencesInRange = createSelector(
  [plannedTimeOffSelect.all, selectDoneDateRange],
  (allTimeOff, doneDateRange): Map<string, Set<string>> => {
    // Returns Map<employeeId, Set<absenceDate>>
    const map = new Map<string, Set<string>>();
    if (!dateRanges.isValidDateRange(doneDateRange)) return map;

    for (const record of allTimeOff) {
      if (record.requestType !== "unplannedAbsence") continue;
      // Unplanned absences are always single-day (dateRange.min === dateRange.max)
      const absenceDate = record.dateRange.min;
      if (absenceDate < doneDateRange.min || absenceDate > doneDateRange.max) continue;

      const existing = map.get(record.employeeId) ?? new Set<string>();
      existing.add(absenceDate);
      map.set(record.employeeId, existing);
    }

    return map;
  },
);

// ---------------------------------------------------------------------------
// Service lookup by servId — used to check hasCallAhead on absence-day assignments
// ---------------------------------------------------------------------------

const selectServiceByServId = createSelector(
  [centralSelect.services],
  (services) => {
    const map = new Map<number, (typeof services)[number]>();
    for (const service of services) {
      map.set(service.servId, service);
    }
    return map;
  },
);

// ---------------------------------------------------------------------------
// Dates on which at least one employee completed work — used to filter out
// rain days (where nobody worked) from suspicious zero-completion days.
// ---------------------------------------------------------------------------

const selectDatesWithAnyCompletion = createSelector(
  [productivitySelect.completedServices],
  (completedServices): Set<string> => {
    const dates = new Set<string>();
    for (const service of completedServices) {
      const doneDate = service.x.doneDate;
      if (doneDate) dates.add(doneDate);
    }
    return dates;
  },
);

// ---------------------------------------------------------------------------
// Reliability metrics by employee
// ---------------------------------------------------------------------------

const selectReliabilityByEmployee = createSelector(
  [
    selectUnplannedAbsencesInRange,
    productivitySelect.assignmentCompletionByEmployee,
    assignmentSelect.assignmentsByEmployeeForRange,
    selectServiceByServId,
    productivitySelect.completedServices,
    selectDatesWithAnyCompletion,
  ],
  (
    unplannedAbsencesByEmployee,
    completionByEmployee,
    assignmentsByEmployee,
    serviceByServId,
    completedServices,
    datesWithAnyCompletion,
  ): Map<string, ReliabilityMetrics> => {
    // Build a set of (employeeId|date) → servIds completed by that employee on that date
    const completedByEmployeeDate = new Map<string, Set<number>>();
    for (const service of completedServices) {
      const doneDate = service.x.doneDate ?? "";
      const doneBys = service.production?.doneBys ?? [];
      for (const doneBy of doneBys) {
        const key = `${doneBy.employeeId}|${doneDate}`;
        const existing = completedByEmployeeDate.get(key) ?? new Set<number>();
        existing.add(service.servId);
        completedByEmployeeDate.set(key, existing);
      }
    }

    // Collect all employee IDs from both sources
    const allEmployeeIds = new Set<string>([
      ...unplannedAbsencesByEmployee.keys(),
      ...completionByEmployee.keys(),
    ]);

    const result = new Map<string, ReliabilityMetrics>();

    for (const employeeId of allEmployeeIds) {
      const completion = completionByEmployee.get(employeeId) ?? null;
      const absenceDates = unplannedAbsencesByEmployee.get(employeeId) ?? new Set<string>();

      // Count assignments on absence days and check for call-aheads
      const employeeAssignments = assignmentsByEmployee.get(employeeId) ?? [];
      let missedAssignments = 0;
      let callAheadsAffected = 0;

      // Group assignments by date for suspicious-day detection
      const assignmentsByDate = new Map<string, typeof employeeAssignments>();
      for (const assignment of employeeAssignments) {
        if (absenceDateSet(absenceDates, assignment.schedDate)) {
          missedAssignments++;
          const service = serviceByServId.get(assignment.servId);
          if (service?.x.hasCallAhead) callAheadsAffected++;
        }
        const existing = assignmentsByDate.get(assignment.schedDate) ?? [];
        existing.push(assignment);
        assignmentsByDate.set(assignment.schedDate, existing);
      }

      // Detect suspicious zero-completion days
      const suspiciousZeroDays: SuspiciousZeroDay[] = [];
      for (const [date, assignments] of assignmentsByDate) {
        // Skip days already recorded as an absence
        if (absenceDates.has(date)) continue;
        // Skip days where nobody else worked (rain day / company closure)
        if (!datesWithAnyCompletion.has(date)) continue;
        // Check if this employee completed anything on this date
        const completedKey = `${employeeId}|${date}`;
        const completedServIds = completedByEmployeeDate.get(completedKey);
        if (completedServIds && completedServIds.size > 0) continue;

        // Zero completions on a day others worked — flag it
        let dayCallAheads = 0;
        for (const assignment of assignments) {
          const service = serviceByServId.get(assignment.servId);
          if (service?.x.hasCallAhead) dayCallAheads++;
        }
        suspiciousZeroDays.push({
          date,
          assignedCount: assignments.length,
          callAheadsAffected: dayCallAheads,
        });
      }

      const actualCompletionPct = completion ? completion.pct : null;

      let hypotheticalCompletionPct: number | null = null;
      let absenceImpactPct: number | null = null;

      if (completion && completion.assigned > 0) {
        const hypotheticalCompleted = completion.completed + missedAssignments;
        hypotheticalCompletionPct = hypotheticalCompleted / completion.assigned;
        absenceImpactPct =
          actualCompletionPct !== null
            ? hypotheticalCompletionPct - actualCompletionPct
            : null;
      }

      const hypotheticalCompleted = completion ? completion.completed + missedAssignments : null;

      result.set(employeeId, {
        actualCompletionPct,
        actualCompletionFraction: completion && completion.assigned > 0
          ? { completed: completion.completed, assigned: completion.assigned }
          : null,
        hypotheticalCompletionPct,
        hypotheticalCompletionFraction:
          completion && completion.assigned > 0 && hypotheticalCompleted !== null
            ? { completed: hypotheticalCompleted, assigned: completion.assigned }
            : null,
        absenceImpactPct,
        unplannedAbsenceCount: absenceDates.size,
        callAheadsAffected,
        servicesHitByAbsences: missedAssignments,
        suspiciousZeroDays: suspiciousZeroDays.sort((a, b) => a.date.localeCompare(b.date)),
      });
    }

    return result;
  },
);

/** Inline helper — avoids creating a closure over the Set in the hot loop. */
function absenceDateSet(set: Set<string>, date: string): boolean {
  return set.has(date);
}

// ---------------------------------------------------------------------------
// Canonical row type for the reliability DataGrid
// ---------------------------------------------------------------------------

export type EmployeeReliabilityRow = {
  employeeId: string;
  employee: Employee | null;
  reliability: ReliabilityMetrics;
};

// ---------------------------------------------------------------------------
// Reliability rows — hydrated for the DataGrid
// ---------------------------------------------------------------------------

const selectReliabilityRows = createSelector(
  [selectReliabilityByEmployee, employeeSelect.employeeMap],
  (reliabilityByEmployee, employeeMap): EmployeeReliabilityRow[] =>
    Array.from(reliabilityByEmployee.entries()).map(([employeeId, reliability]) => ({
      employeeId,
      employee: employeeMap.get(employeeId) ?? null,
      reliability,
    })),
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const reliabilitySelect = {
  unplannedAbsencesInRange: selectUnplannedAbsencesInRange,
  reliabilityByEmployee: selectReliabilityByEmployee,
  reliabilityRows: selectReliabilityRows,
};
