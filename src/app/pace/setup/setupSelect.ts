import { createSelector } from "@reduxjs/toolkit";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

export type SequenceWithGroups = GroupSequence & {
  groups: AssignmentGroup[];
};

/** Sequences with their member AssignmentGroups hydrated inline. */
const selectSequencesWithGroups = createSelector(
  [paceGroupSequenceSelect.sequences, paceAssignmentGroupSelect.assignmentGroupMap],
  (sequences, groupMap): SequenceWithGroups[] =>
    sequences.map((sequence) => ({
      ...sequence,
      groups: sequence.groupIds
        .map((id) => groupMap.get(id))
        .filter((g): g is AssignmentGroup => g !== undefined),
    })),
);

/** AssignmentGroups that belong to no sequence (sequenceId === null). */
const selectStandaloneGroups = createSelector(
  [paceAssignmentGroupSelect.assignmentGroups],
  (groups): AssignmentGroup[] => groups.filter((g) => g.sequenceId === null),
);

export const setupSelect = {
  sequencesWithGroups: selectSequencesWithGroups,
  standaloneGroups: selectStandaloneGroups,
};
