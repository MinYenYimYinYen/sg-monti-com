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
// Assignment Plan
// ---------------------------------------------------------------------------

export type AssignmentPlan = {
  employeeId: string;
  /** Priority-ordered list of AssignmentGroup IDs. Index 0 = highest priority. */
  groupIds: string[];
};
