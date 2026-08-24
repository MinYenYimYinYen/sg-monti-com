// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

/**
 * A named snapshot of all employee assignment plans for scenario exploration.
 * `name` is the natural key — must be unique.
 */
export type Scenario = {
  name: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  plans: AssignmentPlan[];
};

// ---------------------------------------------------------------------------
// Assignment Entries
// ---------------------------------------------------------------------------

/**
 * A single servCode entry in an employee's priority list.
 */
export type AssignmentSingleEntry = {
  kind: "single";
  servCodeId: string;
};

/**
 * A group entry in an employee's priority list.
 *
 * Supports two formats:
 * - Old format (inline): { kind: "group", servCodeIds: string[], label?: string }
 * - New format (reference): { kind: "group", groupId: string }
 *
 * The new format references a shared AssignmentGroup from the assignmentGroup module.
 * The crawler resolves groupId references via assignmentGroupSelect.groupByServCodeKey.
 * Old format data is still supported — the crawler falls back to normalized label.
 */
export type AssignmentGroupEntry = {
  kind: "group";
  /** New format: references AssignmentGroup.groupId in the assignmentGroup collection. */
  groupId?: string;
  /** Old format: inline servCode members. */
  servCodeIds?: string[];
  /** Old format: optional display label. */
  label?: string;
};

export type AssignmentEntry = AssignmentSingleEntry | AssignmentGroupEntry;

export type AssignmentPlan = {
  employeeId: string;
  /** Priority-ordered list of entries. Index 0 = highest priority. */
  entries: AssignmentEntry[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns all servCodeIds referenced in an AssignmentPlan (flattened, order-preserving). */
export function flattenEntries(entries: AssignmentEntry[]): string[] {
  return entries.flatMap((entry) =>
    entry.kind === "single" ? [entry.servCodeId] : (entry.servCodeIds ?? []),
  );
}
