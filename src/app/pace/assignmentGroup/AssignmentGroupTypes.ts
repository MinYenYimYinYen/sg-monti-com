/**
 * A named group of servCodes that are always worked together on the same day.
 * Groups are scenario-level entities — all employees who work this group reference
 * the same groupId. This ensures the crawl uses a single timeline key and the
 * Gantt renders one bar per group regardless of how many employees work it.
 */
export type AssignmentGroupDoc = {
  /** Stable natural key. Auto-generated as sorted servCodeIds joined with "+". */
  groupId: string;
  /** Display label. Defaults to groupId. Can be customized (e.g. "LR1/LM"). */
  label: string;
  /** The servCodes that are always worked together. */
  servCodeIds: string[];
};

/**
 * Hydrated additions resolved from related data modules.
 * Populated by `assignmentGroupSelect.assignmentGroups` — never stored in MongoDB.
 */
export type AssignmentGroupProps = {
  /** The user-created sequenceId this group belongs to. null for standalone groups. */
  sequenceId: string | null;
  /** Planned start date from the active SeasonPlan. null if not scheduled. */
  plannedStart: string | null;
  /** Planned end date from the active SeasonPlan. null if not scheduled. */
  plannedEnd: string | null;
  /** employeeId → goalDailyPrice (null = not set). From AssignmentPlan. */
  goalsByEmployee: Map<string, number | null>;
  /** Priority-ordered employeeIds assigned to this group. From AssignmentPlan. */
  assignedEmployeeIds: string[];
};

/**
 * Fully hydrated AssignmentGroup — the consumable entity for the engine and UI.
 * Combines stored doc fields with data resolved from SeasonPlan and AssignmentPlan.
 */
export type AssignmentGroup = AssignmentGroupDoc & AssignmentGroupProps;
