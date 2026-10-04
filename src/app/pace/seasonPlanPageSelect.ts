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
//
// Reads from sequenceResults — one feasibility row per sequence.
// Synthetic single-member sequences represent standalone groups.
// ---------------------------------------------------------------------------

export type SeasonPlanFeasibilityRow = {
  /** sequenceId for multi-member sequences; groupId + "-seq" for synthetic ones. */
  id: string;
  label: string;
  isSynthetic: boolean;
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
    engineResult.sequenceResults.map((sequence) => {
      // For feasibility, aggregate across members
      const totalActivePool = sequence.members.reduce((sum, m) => sum + m.activePool, 0);
      const totalTeamGoal = sequence.members.reduce((sum, m) => sum + m.teamGoalDailyRate, 0);
      const allDaysNeeded = sequence.members.map((m) => m.daysNeeded).filter((d): d is number => d !== null);
      const allDaysAvailable = sequence.members.map((m) => m.daysAvailable);
      const allDaysEarlyLate = sequence.members.map((m) => m.daysEarlyLate).filter((d): d is number => d !== null);
      const allMissingGoals = [...new Set(sequence.members.flatMap((m) => m.missingGoals))];

      return {
        id: sequence.sequenceId,
        label: sequence.label,
        isSynthetic: sequence.isSynthetic,
        plannedStart: sequence.plannedStart,
        plannedEnd: sequence.plannedEnd,
        activePool: totalActivePool,
        teamGoalDailyRate: totalTeamGoal,
        daysNeeded: allDaysNeeded.length > 0 ? allDaysNeeded.reduce((a, b) => a + b, 0) : null,
        daysAvailable: allDaysAvailable.length > 0 ? Math.min(...allDaysAvailable) : 0,
        daysEarlyLate: allDaysEarlyLate.length > 0 ? Math.max(...allDaysEarlyLate) : null,
        isOnTrack: sequence.members.every((m) => m.isOnTrack),
        isOverdue: sequence.isOverdue,
        missingGoals: allMissingGoals,
      };
    }),
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
