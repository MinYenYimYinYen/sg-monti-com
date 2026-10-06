import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { GroupResult, EmployeeGroupBreakdown } from "@/app/pace/PaceEngineTypes";
import { AppState } from "@/store";

// ---------------------------------------------------------------------------
// Employee Plan page selectors
//
// Derives per-employee card data from engine output.
// The engine already computed all rates, pools, and pace analysis —
// this selector just shapes the data for the Employee Plan page.
// Reads from groupMap (all groups including sequence members).
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState): string => state.pace.mainDate;

/**
 * Per-employee view: for each employee, which groups are they assigned to
 * and what are their goal/avg/required rates?
 *
 * Returns an array sorted by employee name (resolved via employeeMap in the component).
 * Each entry contains the groupId and the employee's breakdown for that group.
 */
export type EmployeePlanGroupRow = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];
  activePool: number;
  plannedEnd: string | null;
  planDeadlineWeekdays: number;
  isOverdue: boolean;
  hasWork: boolean;
  breakdown: EmployeeGroupBreakdown;
  /** Sum of all assigned employees' goals for this group — for team-level days-late display. */
  teamGoalDailyRate: number;
  /** Projected end date from the engine simulation. */
  projectedEndDate: string | null;
  members: GroupResult["members"];
};

export type EmployeePlanData = {
  employeeId: string;
  groups: EmployeePlanGroupRow[];
};

const selectEmployeePlanData = createSelector(
  [paceEngineSelect],
  (engineResult): EmployeePlanData[] => {
    // Iterate all groups via groupMap (includes sequence members)
    const byEmployee = new Map<string, EmployeePlanGroupRow[]>();

    for (const group of engineResult.groupMap.values()) {
      for (const breakdown of group.employeeBreakdowns) {
        const { employeeId } = breakdown;
        if (!byEmployee.has(employeeId)) {
          byEmployee.set(employeeId, []);
        }
        byEmployee.get(employeeId)!.push({
          groupId: group.groupId,
          label: group.label,
          memberServCodeIds: group.memberServCodeIds,
          activePool: group.activePool,
          plannedEnd: group.plannedEnd,
          planDeadlineWeekdays: group.planDeadlineWeekdays,
          isOverdue: group.isOverdue,
          hasWork: group.hasWork,
          breakdown,
          teamGoalDailyRate: group.teamGoalDailyRate,
          projectedEndDate: group.projectedEndDate,
          members: group.members,
        });
      }
    }

    return Array.from(byEmployee.entries()).map(([employeeId, groups]) => ({
      employeeId,
      groups,
    }));
  },
);

export const employeePlanSelect = {
  mainDate: selectMainDate,
  employeePlanData: selectEmployeePlanData,
};
