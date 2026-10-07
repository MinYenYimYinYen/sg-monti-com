import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { SeasonPlan, GroupSchedule } from "@/app/pace/seasonPlan/SeasonPlanTypes";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

const selectSeasonPlans = (state: AppState): SeasonPlan[] =>
  state.paceSeasonPlan.seasonPlans;

const selectActiveSeasonPlan = createSelector(
  [selectSeasonPlans],
  (seasonPlans): SeasonPlan | null => seasonPlans.find((p) => p.isActive) ?? null,
);

const selectInactiveSeasonPlans = createSelector(
  [selectSeasonPlans],
  (seasonPlans): SeasonPlan[] => seasonPlans.filter((p) => !p.isActive),
);

const selectSeasonPlanMap = createSelector(
  [selectSeasonPlans],
  (seasonPlans) => new Grouper(seasonPlans).toUniqueMap((p) => p.name),
);

/**
 * Map of groupId → GroupSchedule from the active SeasonPlan.
 * Returns an empty map when no plan is active.
 */
const selectGroupScheduleMap = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): Map<string, GroupSchedule> => {
    if (!activeSeasonPlan) return new Map();
    const result = new Map<string, GroupSchedule>();
    for (const schedule of activeSeasonPlan.groupSchedules) {
      result.set(schedule.groupId, schedule);
    }
    return result;
  },
);

/**
 * The cascade threshold from the active SeasonPlan.
 * Defaults to 0.95 when no plan is active.
 */
const selectCascadeThreshold = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): number => activeSeasonPlan?.cascadeThreshold ?? 0.95,
);

const selectSnowMelt = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): string | null => activeSeasonPlan?.snowMelt ?? null,
);

const selectSnowDeadline = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): string | null => activeSeasonPlan?.snowDeadline ?? null,
);

/**
 * Helper to build servCodeId → GroupSchedule map given a groupDocMap.
 * Call in selectors that have AssignmentGroupDoc data available.
 */
function buildServCodeScheduleMap(
  groupScheduleMap: Map<string, GroupSchedule>,
  groupDocMap: Map<string, AssignmentGroupDoc>,
): Map<string, GroupSchedule> {
  const result = new Map<string, GroupSchedule>();
  for (const [groupId, schedule] of groupScheduleMap) {
    const groupDoc = groupDocMap.get(groupId);
    const servCodeIds = groupDoc?.servCodeIds ?? groupId.split("+");
    for (const servCodeId of servCodeIds) {
      result.set(servCodeId, schedule);
    }
  }
  return result;
}

export const paceSeasonPlanSelect = {
  seasonPlans: selectSeasonPlans,
  activeSeasonPlan: selectActiveSeasonPlan,
  inactiveSeasonPlans: selectInactiveSeasonPlans,
  seasonPlanMap: selectSeasonPlanMap,
  groupScheduleMap: selectGroupScheduleMap,
  buildServCodeScheduleMap,
  cascadeThreshold: selectCascadeThreshold,
  snowMelt: selectSnowMelt,
  snowDeadline: selectSnowDeadline,
};
