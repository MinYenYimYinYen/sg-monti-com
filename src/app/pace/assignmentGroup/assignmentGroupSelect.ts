import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

const selectGroups = (state: AppState): AssignmentGroup[] =>
  state.paceAssignmentGroup.groups;

/** Map<groupId, AssignmentGroup> for O(1) lookups by groupId. */
const selectGroupMap = createSelector(
  [selectGroups],
  (groups): Map<string, AssignmentGroup> =>
    new Grouper(groups).toUniqueMap((g) => g.groupId),
);

/**
 * Map<sortedServCodeKey, AssignmentGroup> — used to resolve a group by its
 * member composition. Key = [...servCodeIds].sort().join("+")
 */
const selectGroupByServCodeKey = createSelector(
  [selectGroups],
  (groups): Map<string, AssignmentGroup> => {
    const result = new Map<string, AssignmentGroup>();
    for (const group of groups) {
      const key = [...group.servCodeIds].sort().join("+");
      result.set(key, group);
    }
    return result;
  },
);

export const paceAssignmentGroupSelect = {
  groups: selectGroups,
  groupMap: selectGroupMap,
  groupByServCodeKey: selectGroupByServCodeKey,
};
