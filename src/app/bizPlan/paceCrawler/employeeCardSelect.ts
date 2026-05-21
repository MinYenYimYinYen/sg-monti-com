import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { flattenEntries } from "@/app/bizPlan/assignmentPlan/AssignmentPlanTypes";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OpenServCodeRow = {
  servCodeId: string;
  /** Employee's $/day for this servCode — the "route this much today" number. */
  dailyRate: number;
  /** Active+asap pool price remaining (unscheduled work). */
  poolRemaining: number;
};

export type EmployeeCardPlanData = {
  employee: Employee;
  /** True when the employee has any printed service with schedDate === mainDate. */
  isAlreadyRouted: boolean;
  /** Priority-ordered list of open servCodes for this employee on mainDate. */
  openServCodes: OpenServCodeRow[];
};

// ---------------------------------------------------------------------------
// Layer 1 — Already Routed flag per employee
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState): string => state.paceCrawler.mainDate;

/**
 * "Which employees have already been routed for mainDate?"
 *
 * = employees with at least one printed service (status "$") where
 *   lastAssigned.schedDate === mainDate.
 */
const selectAlreadyRoutedByEmployee = createSelector(
  [deepSelect.servCodes, selectMainDate],
  (servCodes, mainDate): Set<string> => {
    const result = new Set<string>();
    for (const servCode of servCodes) {
      for (const service of servCode.services) {
        if (
          service.status === "$" &&
          service.lastAssigned.schedDate === mainDate &&
          service.lastAssigned.employeeId
        ) {
          result.add(service.lastAssigned.employeeId);
        }
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Layer 2 — Open ServCode Rows per Employee
// ---------------------------------------------------------------------------

/**
 * "For each assigned employee, which servCodes are open today and what are their rates?"
 *
 * A servCode is open if:
 * 1. It is in the employee's assignment plan (single or group member)
 * 2. mainDate is within servCode.dateRange (or alwaysAsap === true)
 * 3. activePoolPriceByServCode > 0 (has unscheduled work)
 *
 * Rows are in priority order from the assignment plan.
 * Map<employeeId, OpenServCodeRow[]>
 */
// ---------------------------------------------------------------------------
// Layer 3 — Employee Card Data
// ---------------------------------------------------------------------------

/**
 * "One card per assigned employee with all display data assembled."
 *
 * Sorted: employees with open servCodes first (alphabetically by name),
 * then employees with no open servCodes (alphabetically by name).
 */


// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const employeeCardSelect = {
  alreadyRoutedByEmployee: selectAlreadyRoutedByEmployee,

};
