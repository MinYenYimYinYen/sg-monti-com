import { GroupResult, UrgentGroup } from "@/app/pace/PaceEngineTypes";

/**
 * Classifies groups into the urgent list.
 *
 * Priority (checked in order — a group matches exactly one):
 *   1. "overdue" — plannedEnd is in the past AND hasWork
 *   2. "unplanned" — has work remaining but no plannedEnd in the active SeasonPlan
 *
 * alwaysAsap servCodes are excluded from the engine entirely and handled
 * independently by the Priorities page via deepSelect.servCodes.
 *
 * Groups with no work remaining are excluded from the urgent list.
 */
export function classifyUrgency(groups: GroupResult[]): UrgentGroup[] {
  const urgentGroups: UrgentGroup[] = [];

  for (const group of groups) {
    if (!group.hasWork) continue;

    if (group.isOverdue && group.plannedEnd !== null) {
      urgentGroups.push({
        groupId: group.groupId,
        label: group.label,
        reason: { kind: "overdue", deadline: group.plannedEnd },
      });
    } else if (group.plannedEnd === null) {
      urgentGroups.push({
        groupId: group.groupId,
        label: group.label,
        reason: { kind: "unplanned" },
      });
    }
  }

  return urgentGroups;
}
