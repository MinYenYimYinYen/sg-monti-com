import { GroupContext } from "@/app/pace/PaceEngineTypes";
import { PaceEngineInputs } from "@/app/pace/lib/PaceEngineInputs";
import { resolveGroupSchedule } from "./helpers/resolveGroupSchedule";
import { resolveGroupAssignments } from "./helpers/resolveGroupAssignments";

/**
 * Phase 0: Resolve one GroupContext per AssignmentGroup.
 *
 * Combines AssignmentGroup + GroupSchedule + AssignmentPlan data into a
 * single context object per group. This is the engine's working unit —
 * all subsequent phases operate on GroupContext[], not raw inputs.
 *
 * Only groups that appear in the active scenario's assignment plans are
 * included. Groups with no assigned employees are excluded — the engine
 * cannot project work for unassigned groups.
 */
export function buildGroupContexts(inputs: PaceEngineInputs): GroupContext[] {
  const {
    groups,
    groupScheduleMap,
    assignmentPlans,
    sequenceIdByGroupId,
  } = inputs;

  const contexts: GroupContext[] = [];

  for (const group of groups) {
    const { assignedEmployeeIds, goalsByEmployee } = resolveGroupAssignments(
      group.groupId,
      assignmentPlans,
    );

    // Skip groups with no assigned employees — engine cannot project them.
    if (assignedEmployeeIds.length === 0) continue;

    const { plannedStart, plannedEnd } = resolveGroupSchedule(
      group.groupId,
      groupScheduleMap,
    );

    const sequenceId = sequenceIdByGroupId.get(group.groupId) ?? null;

    contexts.push({
      groupId: group.groupId,
      label: group.label,
      memberServCodeIds: group.servCodeIds,
      sequenceId,
      plannedStart,
      plannedEnd,
      goalsByEmployee,
      assignedEmployeeIds,
    });
  }

  return contexts;
}
