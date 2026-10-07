import { GroupPoolState } from "@/app/pace/lib/PaceEngineTypes";

/**
 * Drains a group's pool by the given employee's goal rate on a single day.
 *
 * Returns the actual amount drained (may be less than goalRate if pool is small).
 */
export function drainGroupPool({
  poolState,
  goalRate,
}: {
  poolState: GroupPoolState;
  goalRate: number;
}): number {
  if (poolState.poolRemaining <= 0 || goalRate <= 0) return 0;

  const actualDrain = Math.min(goalRate, poolState.poolRemaining);
  poolState.poolRemaining -= actualDrain;
  poolState.completedSoFar += actualDrain;

  return actualDrain;
}
