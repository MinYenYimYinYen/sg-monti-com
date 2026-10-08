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
  /**
   * Minimum calendar days that must elapse between completing a predecessor service
   * and starting the matching successor service (matched by progId).
   *
   * 0 = no constraint (successor can be worked immediately after predecessor).
   * Applies to every consecutive pair in the sequence (index i → index i+1).
   * The first group in the sequence ignores this field.
   *
   * Example: daysSince = 21 means LR6 cannot be done until 21 calendar days after LR5.
   */
  daysSince: number;
};
