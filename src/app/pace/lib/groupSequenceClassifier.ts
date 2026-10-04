import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

/**
 * A pre-built lookup object that answers all sequence-membership questions
 * the engine needs. Built once per engine run from the active sequences.
 *
 * Centralizes the logic for:
 * - Which groups are in a sequence (and where: first / middle / last)
 * - Which groups are standalone (not in any sequence)
 * - Whether a group is a "straggler" eligible to be abandoned
 * - Whether a group should receive pool history snapshots on a given day
 *
 * Passed into crawlPastPhase and crawlFuturePhase so neither phase
 * re-derives these sets independently.
 */
export type GroupSequenceClassifier = {
  /** True if the group is part of any sequence (first, middle, or last). */
  isInSequence: (groupId: string) => boolean;
  /** True if the group is the first member of a sequence (index 0). */
  isFirstInSequence: (groupId: string) => boolean;
  /** True if the group is the last member of a sequence (final index). */
  isLastInSequence: (groupId: string) => boolean;
  /** True if the group is a middle member (not first, not last). */
  isMiddleInSequence: (groupId: string) => boolean;
  /** True if the group is standalone — not part of any sequence. */
  isStandalone: (groupId: string) => boolean;
  /**
   * True if the group qualifies as a "straggler" on the given day.
   *
   * A straggler is a STANDALONE group that is past its plannedEnd and has
   * crossed the cascade threshold — the team has moved on; stop projecting it.
   *
   * Sequence members (first, middle, or last) are NEVER stragglers.
   * They always drain to zero or cascade their remainder to the next group.
   */
  isStraggler: ({
    groupId,
    day,
    plannedEnd,
    completionPct,
    cascadeThreshold,
  }: {
    groupId: string;
    day: string;
    plannedEnd: string | null;
    completionPct: number;
    cascadeThreshold: number;
  }) => boolean;
  /**
   * True if the group should receive a pool history snapshot on the given day.
   *
   * Locked groups (sequence successors not yet cascade-unlocked) are excluded —
   * they have no active work and recording $0 snapshots would misrepresent the burndown.
   */
  isActiveForSnapshot: (groupId: string, lockedGroupIds: Set<string>) => boolean;
};

/**
 * Builds a GroupSequenceClassifier from the active sequences.
 * Call once at the start of each engine run.
 */
export function buildGroupSequenceClassifier(sequences: GroupSequence[]): GroupSequenceClassifier {
  const inSequence = new Set<string>();
  const firstInSequence = new Set<string>();
  const lastInSequence = new Set<string>();
  const middleInSequence = new Set<string>();

  for (const sequence of sequences) {
    const { groupIds } = sequence;
    for (let i = 0; i < groupIds.length; i++) {
      const groupId = groupIds[i];
      inSequence.add(groupId);
      if (i === 0) {
        firstInSequence.add(groupId);
      } else if (i === groupIds.length - 1) {
        lastInSequence.add(groupId);
      } else {
        middleInSequence.add(groupId);
      }
    }
  }

  return {
    isInSequence: (groupId) => inSequence.has(groupId),
    isFirstInSequence: (groupId) => firstInSequence.has(groupId),
    isLastInSequence: (groupId) => lastInSequence.has(groupId),
    isMiddleInSequence: (groupId) => middleInSequence.has(groupId),
    isStandalone: (groupId) => !inSequence.has(groupId),

    isStraggler: ({ groupId, day, plannedEnd, completionPct, cascadeThreshold }) =>
      !inSequence.has(groupId) &&
      plannedEnd !== null &&
      day > plannedEnd &&
      completionPct >= cascadeThreshold,

    isActiveForSnapshot: (groupId, lockedGroupIds) => !lockedGroupIds.has(groupId),
  };
}
