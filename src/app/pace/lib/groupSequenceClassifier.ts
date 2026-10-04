import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

/**
 * A pre-built lookup object that answers all sequence-membership questions
 * the engine needs. Built once per engine run from the normalized sequences
 * (which include synthetic single-member sequences for standalone groups).
 *
 * Centralizes the logic for:
 * - Which groups are in a sequence (always true in the unified model)
 * - Where in the sequence a group sits (first / middle / last / only)
 * - Whether a group is a "straggler" eligible to be abandoned
 * - Whether a group should receive pool history snapshots on a given day
 *
 * Passed into crawlPastPhase and crawlFuturePhase so neither phase
 * re-derives these sets independently.
 */
export type GroupSequenceClassifier = {
  /** True if the group is part of any sequence (first, middle, or last). Always true in the unified model. */
  isInSequence: (groupId: string) => boolean;
  /** True if the group is the first member of a sequence (index 0). */
  isFirstInSequence: (groupId: string) => boolean;
  /** True if the group is the last member of a sequence (final index). */
  isLastInSequence: (groupId: string) => boolean;
  /** True if the group is a middle member (not first, not last). */
  isMiddleInSequence: (groupId: string) => boolean;
  /**
   * True if the group is the only member of its sequence.
   * In the unified model, this means it was a standalone group wrapped in a synthetic sequence.
   * Single-member sequences can be stragglers; multi-member sequence members cannot.
   */
  isOnlyMember: (groupId: string) => boolean;
  /**
   * True if the group qualifies as a "straggler" on the given day.
   *
   * A straggler is a group that is the ONLY member of its sequence (i.e., a standalone group
   * wrapped in a synthetic sequence), is past its plannedEnd, and has crossed the cascade
   * threshold — the team has moved on; stop projecting it.
   *
   * Multi-member sequence members (first, middle, or last) are NEVER stragglers.
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
  /**
   * True if the group should receive a mainDate handoff snapshot in the past phase.
   *
   * Locked sequence successors (index > 0 in a multi-member sequence) have not opened
   * yet at mainDate — they should not appear in the burndown until the cascade fires.
   * Single-member sequences (synthetic standalones) always get a mainDate snapshot.
   */
  shouldHaveMainDateSnapshot: (groupId: string) => boolean;
};

/**
 * Builds a GroupSequenceClassifier from the normalized sequences.
 * Call once at the start of each engine run.
 *
 * In the unified model, `sequences` always contains ALL groups — some as
 * multi-member user-created sequences, some as synthetic single-member sequences.
 */
export function buildGroupSequenceClassifier(sequences: GroupSequence[]): GroupSequenceClassifier {
  const inSequence = new Set<string>();
  const firstInSequence = new Set<string>();
  const lastInSequence = new Set<string>();
  const middleInSequence = new Set<string>();
  const onlyMember = new Set<string>();

  for (const sequence of sequences) {
    const { groupIds } = sequence;
    for (let i = 0; i < groupIds.length; i++) {
      const groupId = groupIds[i];
      inSequence.add(groupId);
      if (groupIds.length === 1) {
        // Single-member sequence — first AND last AND only
        firstInSequence.add(groupId);
        lastInSequence.add(groupId);
        onlyMember.add(groupId);
      } else if (i === 0) {
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
    isOnlyMember: (groupId) => onlyMember.has(groupId),

    // Stragglers: only single-member sequences (synthetic standalones) can be abandoned.
    // Multi-member sequence members always drain to zero or cascade forward.
    isStraggler: ({ groupId, day, plannedEnd, completionPct, cascadeThreshold }) =>
      onlyMember.has(groupId) &&
      plannedEnd !== null &&
      day > plannedEnd &&
      completionPct >= cascadeThreshold,

    isActiveForSnapshot: (groupId, lockedGroupIds) => !lockedGroupIds.has(groupId),

    // A group gets a mainDate snapshot if it is the only member of its sequence
    // (synthetic standalone) OR if it is the first member of a multi-member sequence
    // (already open at mainDate). Non-first multi-member sequence members are locked
    // and should not appear in the burndown until the cascade fires.
    shouldHaveMainDateSnapshot: (groupId) =>
      onlyMember.has(groupId) || firstInSequence.has(groupId),
  };
}
