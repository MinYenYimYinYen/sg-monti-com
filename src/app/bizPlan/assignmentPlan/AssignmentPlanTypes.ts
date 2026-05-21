/**
 * A single servCode entry in an employee's priority list.
 */
export type AssignmentSingleEntry = {
  kind: "single";
  servCodeId: string;
};

/**
 * A group of servCodes that are always worked together on the same day.
 * The group is treated as a single priority slot in the crawl simulation.
 *
 * Constraints:
 * - At most one sequential servCode per group.
 * - A servCode can belong to at most one group per employee.
 */
export type AssignmentGroupEntry = {
  kind: "group";
  servCodeIds: string[];
  /** Optional display label, e.g. "Renovation Bundle". Defaults to servCodeIds joined with "+". */
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
    entry.kind === "single" ? [entry.servCodeId] : entry.servCodeIds,
  );
}
