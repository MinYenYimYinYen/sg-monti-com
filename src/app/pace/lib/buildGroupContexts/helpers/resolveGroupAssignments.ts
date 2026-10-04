import { AssignmentPlan } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { GroupContext } from "@/app/pace/PaceEngineTypes";

/**
 * Resolves the employee assignments for a group from the active scenario's plans.
 *
 * Returns:
 * - `assignedEmployeeIds`: priority-ordered list of employees assigned to this group
 * - `goalsByEmployee`: Map<employeeId, goalDailyPrice | null>
 *
 * An employee is "assigned" to a group if the group appears in their groupAssignments list.
 * Priority order is preserved (index 0 = highest priority).
 */
export function resolveGroupAssignments(
  groupId: string,
  assignmentPlans: AssignmentPlan[],
): Pick<GroupContext, "assignedEmployeeIds" | "goalsByEmployee"> {
  const assignedEmployeeIds: string[] = [];
  const goalsByEmployee = new Map<string, number | null>();

  for (const plan of assignmentPlans) {
    const ga = plan.groupAssignments.find((g) => g.groupId === groupId);
    if (ga) {
      assignedEmployeeIds.push(plan.employeeId);
      goalsByEmployee.set(plan.employeeId, ga.dailyRevenueGoal);
    }
  }

  return { assignedEmployeeIds, goalsByEmployee };
}
