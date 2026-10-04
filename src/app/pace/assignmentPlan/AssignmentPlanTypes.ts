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

/**
 * One group assignment for an employee — the group they work and their daily revenue goal.
 * `dailyRevenueGoal` is null when no goal has been set.
 *
 * In the new engine, `dailyRevenueGoal` is a required input for the simulation phase.
 * Groups with null goals produce `projectedEndDate: null` and appear in `missingGoals`.
 */
export type GroupAssignment = {
  groupId: string;
  dailyRevenueGoal: number | null;
};

export type AssignmentPlan = {
  employeeId: string;
  /** Priority-ordered list of group assignments. Index 0 = highest priority. */
  groupAssignments: GroupAssignment[];
};
