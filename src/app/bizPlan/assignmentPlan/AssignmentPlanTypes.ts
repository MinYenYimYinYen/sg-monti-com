export type AssignmentPlan = {
  employeeId: string;
  servCodeIds: string[]; // ordered by priority, index 0 = highest
};
