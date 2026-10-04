import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

const selectSequences = (state: AppState): GroupSequence[] =>
  state.paceGroupSequence.sequences;

/** Map<sequenceId, GroupSequence> for O(1) lookups. */
const selectSequenceMap = createSelector(
  [selectSequences],
  (sequences): Map<string, GroupSequence> =>
    new Grouper(sequences).toUniqueMap((s) => s.sequenceId),
);

/**
 * Map<groupId, sequenceId> — for each groupId, which sequence does it belong to?
 * Used by the engine to set GroupResult.sequenceId and by the Gantt to group bars.
 */
const selectSequenceIdByGroupId = createSelector(
  [selectSequences],
  (sequences): Map<string, string> => {
    const result = new Map<string, string>();
    for (const sequence of sequences) {
      for (const groupId of sequence.groupIds) {
        result.set(groupId, sequence.sequenceId);
      }
    }
    return result;
  },
);

export const paceGroupSequenceSelect = {
  sequences: selectSequences,
  sequenceMap: selectSequenceMap,
  sequenceIdByGroupId: selectSequenceIdByGroupId,
};
