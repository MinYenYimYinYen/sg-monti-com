import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import {
  AssignmentGroup,
  AssignmentGroupDoc,
} from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { paceAssignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";

const selectAssignmentGroupDocs = (state: AppState): AssignmentGroupDoc[] =>
  state.paceAssignmentGroup.assignmentGroupDocs ?? [];

/**
 * Fully hydrated AssignmentGroup[] — resolves sequenceId, plannedStart/End,
 * goalsByEmployee, and assignedEmployeeIds from related data modules.
 */
const selectAssignmentGroups = createSelector(
  [
    selectAssignmentGroupDocs,
    paceGroupSequenceSelect.sequenceIdByGroupId,
    paceSeasonPlanSelect.groupScheduleMap,
    paceAssignmentPlanSelect.assignmentPlans,
  ],
  (
    assignmentGroupDocs,
    sequenceIdByGroupId,
    groupScheduleMap,
    assignmentPlans,
  ): AssignmentGroup[] =>
    assignmentGroupDocs.map((doc): AssignmentGroup => {
      const schedule = groupScheduleMap.get(doc.groupId);
      const sequenceId = sequenceIdByGroupId.get(doc.groupId) ?? null;

      const assignedEmployeeIds: string[] = [];
      const goalsByEmployee = new Map<string, number | null>();
      for (const plan of assignmentPlans) {
        const groupAssignment = plan.groupAssignments.find((ga) => ga.groupId === doc.groupId);
        if (groupAssignment) {
          assignedEmployeeIds.push(plan.employeeId);
          goalsByEmployee.set(plan.employeeId, groupAssignment.dailyRevenueGoal);
        }
      }

      return {
        ...doc,
        sequenceId,
        plannedStart: schedule?.plannedStart ?? null,
        plannedEnd: schedule?.plannedEnd ?? null,
        goalsByEmployee,
        assignedEmployeeIds,
      };
    }),
);

/** Map<groupId, AssignmentGroup> for O(1) lookups by groupId. */
const selectAssignmentGroupMap = createSelector(
  [selectAssignmentGroups],
  (assignmentGroups): Map<string, AssignmentGroup> =>
    new Grouper(assignmentGroups).toUniqueMap((g) => g.groupId),
);

/**
 * Map<sortedServCodeKey, AssignmentGroup> — used to resolve a group by its
 * member composition. Key = [...servCodeIds].sort().join("+")
 */
const selectAssignmentGroupByServCodeKey = createSelector(
  [selectAssignmentGroups],
  (assignmentGroups): Map<string, AssignmentGroup> => {
    const result = new Map<string, AssignmentGroup>();
    for (const assignmentGroup of assignmentGroups) {
      const key = [...assignmentGroup.servCodeIds].sort().join("+");
      result.set(key, assignmentGroup);
    }
    return result;
  },
);

export const paceAssignmentGroupSelect = {
  assignmentGroupDocs: selectAssignmentGroupDocs,
  assignmentGroups: selectAssignmentGroups,
  assignmentGroupMap: selectAssignmentGroupMap,
  assignmentGroupByServCodeKey: selectAssignmentGroupByServCodeKey,
};
