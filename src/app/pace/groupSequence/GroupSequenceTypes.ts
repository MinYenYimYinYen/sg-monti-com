/**
 * An ordered chain of AssignmentGroups that unlock sequentially.
 * groupIds[0] opens at its plannedStart; groupIds[1] opens when groupIds[0]
 * reaches the cascadeThreshold (from the active SeasonPlan), and so on.
 *
 * Any remaining pool from a predecessor is carried forward into the successor
 * when the cascade unlock fires.
 *
 * GroupResult gains a `sequenceId: string | null` field so the Gantt can
 * visually group sequential bars together.
 */
export type GroupSequence = {
  /** Stable natural key, e.g. "lr-sequence". */
  sequenceId: string;
  /** Display name, e.g. "Lawn Renovation". */
  label: string;
  /** Ordered groupIds — index 0 opens first, index 1 opens when 0 hits threshold. */
  groupIds: string[];
};
