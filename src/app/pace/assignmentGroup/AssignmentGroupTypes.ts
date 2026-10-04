/**
 * A named group of servCodes that are always worked together on the same day.
 * Groups are scenario-level entities — all employees who work this group reference
 * the same groupId. This ensures the crawl uses a single timeline key and the
 * Gantt renders one bar per group regardless of how many employees work it.
 */
export type AssignmentGroup = {
  /** Stable natural key. Auto-generated as sorted servCodeIds joined with "+". */
  groupId: string;
  /** Display label. Defaults to groupId. Can be customized (e.g. "Renovation Bundle"). */
  label: string;
  /** The servCodes that are always worked together. */
  servCodeIds: string[];
};
