import { GroupPoolState } from "@/app/pace/PaceEngineTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

/**
 * Checks whether any group in a sequence should cascade-unlock its successor.
 *
 * Cascade unlock fires when EITHER:
 *   completionPct >= cascadeThreshold  (e.g. 95% of total pool completed)
 *   OR today > plannedEnd              (from SeasonPlan)
 *
 * When a cascade fires:
 * - The predecessor's remaining pool is carried forward into the successor.
 * - The successor's lock is removed (it becomes eligible for the crawl).
 * - The predecessor's pool is set to zero.
 *
 * Mutates poolStates in place.
 */
export function resolveSequenceCascade({
  sequences,
  poolStates,
  lockedGroupIds,
  groupScheduleMap,
  cascadeThreshold,
  day,
}: {
  sequences: GroupSequence[];
  poolStates: Map<string, GroupPoolState>;
  /** Set of groupIds currently locked (waiting for predecessor to cascade). */
  lockedGroupIds: Set<string>;
  /** Map<groupId, plannedEnd | null>. */
  groupScheduleMap: Map<string, string | null>;
  cascadeThreshold: number;
  day: string;
}): void {
  for (const sequence of sequences) {
    for (let i = 0; i < sequence.groupIds.length - 1; i++) {
      const predecessorId = sequence.groupIds[i];
      const successorId = sequence.groupIds[i + 1];

      if (!lockedGroupIds.has(successorId)) continue; // already unlocked

      const predecessorState = poolStates.get(predecessorId);
      if (!predecessorState) continue;

      const shouldCascade = shouldUnlock(
        predecessorState,
        groupScheduleMap.get(predecessorId) ?? null,
        cascadeThreshold,
        day,
      );

      if (shouldCascade) {
        const successorState = poolStates.get(successorId);
        if (successorState && predecessorState.poolRemaining > 0) {
          // Carry remaining pool forward
          successorState.poolRemaining += predecessorState.poolRemaining;
          successorState.totalPool += predecessorState.poolRemaining;
          predecessorState.poolRemaining = 0;
        }
        lockedGroupIds.delete(successorId);
      }
    }
  }
}

function shouldUnlock(
  state: GroupPoolState,
  plannedEnd: string | null,
  cascadeThreshold: number,
  day: string,
): boolean {
  if (state.poolRemaining <= 0) return true;

  if (state.totalPool > 0) {
    const completionPct = state.completedSoFar / state.totalPool;
    if (completionPct >= cascadeThreshold) return true;
  }

  if (plannedEnd && day > plannedEnd) return true;

  return false;
}
