import { createSelector } from "@reduxjs/toolkit";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { assignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

// ---------------------------------------------------------------------------
// Season Plan page selectors
//
// The Season Plan page reads feasibility data from the hydrated AssignmentGroup
// selector — which already carries plannedStart/End, goalsByEmployee, and
// assignedEmployeeIds. No engine run is needed for the feasibility table.
// ---------------------------------------------------------------------------

export const seasonPlanPageSelect = {
  /** Re-exported for the plan list and form. */
  seasonPlans: paceSeasonPlanSelect.seasonPlans,
  activeSeasonPlan: paceSeasonPlanSelect.activeSeasonPlan,
  /** Re-exported for the group schedule sliders. */
  assignmentGroups: paceAssignmentGroupSelect.assignmentGroups,
  /** Re-exported for the assignment plan (goal rates for feasibility). */
  assignmentPlans: assignmentPlanSelect.assignmentPlans,
  /** Re-exported for holiday exclusion in feasibility. */
  holidayDates: holidaySelect.holidayDates,
  /** Re-exported for PTO/availability in feasibility. */
  employeeMap: employeeSelect.employeeMap,
};
