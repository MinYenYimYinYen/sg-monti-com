import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { paceAssignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

// ---------------------------------------------------------------------------
// Season Plan page selectors
//
// The Season Plan page reads feasibility data directly from the engine output.
// daysNeeded, daysAvailable, and daysEarlyLate are first-class fields on GroupResult —
// no inline re-computation needed.
// ---------------------------------------------------------------------------

export type SeasonPlanFeasibilityRow = {
  groupId: string;
  label: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  activePool: number;
  teamGoalDailyRate: number;
  daysNeeded: number | null;
  daysAvailable: number;
  daysEarlyLate: number | null;
  isOnTrack: boolean;
  isOverdue: boolean;
  missingGoals: string[];
};

const selectFeasibilityRows = createSelector(
  [paceEngineSelect],
  (engineResult): SeasonPlanFeasibilityRow[] =>
    engineResult.groups.map((group) => ({
      groupId: group.groupId,
      label: group.label,
      plannedStart: group.plannedStart,
      plannedEnd: group.plannedEnd,
      activePool: group.activePool,
      teamGoalDailyRate: group.teamGoalDailyRate,
      daysNeeded: group.daysNeeded,
      daysAvailable: group.daysAvailable,
      daysEarlyLate: group.daysEarlyLate,
      isOnTrack: group.isOnTrack,
      isOverdue: group.isOverdue,
      missingGoals: group.missingGoals,
    })),
);

export const seasonPlanPageSelect = {
  feasibilityRows: selectFeasibilityRows,
  /** Re-exported for the plan list and form. */
  seasonPlans: paceSeasonPlanSelect.seasonPlans,
  activeSeasonPlan: paceSeasonPlanSelect.activeSeasonPlan,
  /** Re-exported for the group schedule sliders. */
  groups: paceAssignmentGroupSelect.groups,
  /** Re-exported for the assignment plan (goal rates for feasibility). */
  assignmentPlans: paceAssignmentPlanSelect.assignmentPlans,
  /** Re-exported for holiday exclusion in feasibility. */
  holidayDates: holidaySelect.holidayDates,
  /** Re-exported for PTO/availability in feasibility. */
  employeeMap: employeeSelect.employeeMap,
};
