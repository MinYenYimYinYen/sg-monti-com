import { GroupContext } from "@/app/pace/PaceEngineTypes";
import { GroupSchedule } from "@/app/pace/seasonPlan/SeasonPlanTypes";

/**
 * Resolves the planned start/end dates for a group from the active SeasonPlan.
 * Returns null for both when the group has no schedule entry.
 */
export function resolveGroupSchedule(
  groupId: string,
  groupScheduleMap: Map<string, GroupSchedule>,
): Pick<GroupContext, "plannedStart" | "plannedEnd"> {
  const schedule = groupScheduleMap.get(groupId);
  return {
    plannedStart: schedule?.plannedStart ?? null,
    plannedEnd: schedule?.plannedEnd ?? null,
  };
}
