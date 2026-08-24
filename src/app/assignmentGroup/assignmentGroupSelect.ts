import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";

const selectGroups = (state: AppState): AssignmentGroup[] =>
  state.assignmentGroup.groups;

/** Map<groupId, AssignmentGroup> for O(1) lookups by groupId. */
const selectGroupMap = createSelector(
  [selectGroups],
  (groups): Map<string, AssignmentGroup> =>
    new Grouper(groups).toUniqueMap((g) => g.groupId),
);

/**
 * Map<sortedServCodeKey, AssignmentGroup> — used to resolve old-format
 * AssignmentGroupEntry (inline servCodeIds) to the shared group.
 * Key = [...servCodeIds].sort().join("+")
 *
 * This allows the crawler to look up a shared group by its member composition,
 * even when the stored entry uses the old inline format.
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

export const assignmentGroupSelect = {
  groups: selectGroups,
  groupMap: selectGroupMap,
  groupByServCodeKey: selectGroupByServCodeKey,
};
