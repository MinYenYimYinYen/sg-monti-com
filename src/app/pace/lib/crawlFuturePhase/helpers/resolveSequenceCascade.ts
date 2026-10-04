import { GroupPoolState } from "@/app/pace/PaceEngineTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

/**
 * Checks whether any group in a sequence should cascade-unlock its successor.
 *
 * Cascade unlock fires when BOTH:
 *   today > plannedEnd              (from SeasonPlan)
 *   AND completionPct >= cascadeThreshold  (e.g. 95% of total pool completed)
 *
 * Either condition alone is insufficient. The successor only opens when the
 * predecessor's planned window has passed AND enough work is complete.
 *
 * Special case: if the predecessor's pool is fully drained, cascade fires
 * unconditionally (nothing left to carry forward).
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
  successorPlannedStartMap,
  cascadeThreshold,
  day,
}: {
  sequences: GroupSequence[];
  poolStates: Map<string, GroupPoolState>;
  /** Set of groupIds currently locked (waiting for predecessor to cascade). */
  lockedGroupIds: Set<string>;
  /** Map<groupId, plannedEnd | null> — predecessor's planned end date (cascade trigger). */
  groupScheduleMap: Map<string, string | null>;
  /** Map<groupId, plannedStart | null> — successor's planned start date (open gate). */
  successorPlannedStartMap: Map<string, string | null>;
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

      const plannedEnd = groupScheduleMap.get(predecessorId) ?? null;
      const predecessorDone = shouldUnlock(predecessorState, plannedEnd, cascadeThreshold, day);

      if (!predecessorDone) continue;

      // Also require that the successor's own plannedStart has been reached.
      // A cascade-eligible predecessor does not open the successor early.
      const successorStart = successorPlannedStartMap.get(successorId) ?? null;
      if (successorStart && day < successorStart) continue;

      // Cascade fires: carry remaining pool forward and unlock successor
      const successorState = poolStates.get(successorId);
      if (successorState && predecessorState.poolRemaining > 0) {
        successorState.poolRemaining += predecessorState.poolRemaining;
        successorState.totalPool += predecessorState.poolRemaining;
        predecessorState.poolRemaining = 0;
      }
      lockedGroupIds.delete(successorId);
    }
  }
}

function shouldUnlock(
  state: GroupPoolState,
  plannedEnd: string | null,
  cascadeThreshold: number,
  day: string,
): boolean {
  // Pool fully drained — always cascade regardless of date
  if (state.poolRemaining <= 0) return true;

  // Both conditions must be met: past plannedEnd AND threshold crossed.
  // Either condition alone is insufficient — the successor only opens when
  // the predecessor's planned window has passed AND enough work is complete.
  if (plannedEnd && day > plannedEnd && state.totalPool > 0) {
    const completionPct = state.completedSoFar / state.totalPool;
    if (completionPct >= cascadeThreshold) return true;
  }

  return false;
}
