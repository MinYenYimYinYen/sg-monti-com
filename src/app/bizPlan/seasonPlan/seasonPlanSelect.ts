import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { SeasonPlan, GroupSchedule } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";
import { AssignmentGroup } from "@/app/assignmentGroup/AssignmentGroupTypes";

const selectSeasonPlans = (state: AppState) => state.seasonPlan.seasonPlans;

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
 * Map of servCodeId → plannedEnd from the active SeasonPlan.
 *
 * Derived by resolving each GroupSchedule's groupId to its member servCodeIds
 * via the provided groupMap. Each member servCode gets the group's plannedEnd.
 *
 * Used by the crawler for cascade unlock:
 *   unlock when completionPct >= cascadeThreshold OR today > plannedEnd
 *
 * Returns an empty map when no plan is active.
 */
function buildServCodeScheduleMap(
  groupScheduleMap: Map<string, GroupSchedule>,
  groupMap: Map<string, AssignmentGroup>,
): Map<string, GroupSchedule> {
  const result = new Map<string, GroupSchedule>();
  for (const [groupId, schedule] of groupScheduleMap) {
    const group = groupMap.get(groupId);
    // Fall back to splitting groupId on "+" if group not in map
    const servCodeIds = group?.servCodeIds ?? groupId.split("+");
    for (const servCodeId of servCodeIds) {
      result.set(servCodeId, schedule);
    }
  }
  return result;
}

/**
 * The cascade threshold from the active SeasonPlan.
 * Defaults to 0.95 when no plan is active.
 */
const selectCascadeThreshold = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): number => activeSeasonPlan?.cascadeThreshold ?? 0.95,
);

/**
 * The snow melt date from the active SeasonPlan.
 * Null when no plan is active or no snow melt date is set.
 */
const selectSnowMelt = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): string | null => activeSeasonPlan?.snowMelt ?? null,
);

/**
 * The snow deadline from the active SeasonPlan.
 * Null when no plan is active or no deadline is set.
 */
const selectSnowDeadline = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): string | null => activeSeasonPlan?.snowDeadline ?? null,
);

export const seasonPlanSelect = {
  seasonPlans: selectSeasonPlans,
  activeSeasonPlan: selectActiveSeasonPlan,
  inactiveSeasonPlans: selectInactiveSeasonPlans,
  seasonPlanMap: selectSeasonPlanMap,
  groupScheduleMap: selectGroupScheduleMap,
  /** Helper to build servCodeId → GroupSchedule map given a groupMap. Call in selectors that have groupMap available. */
  buildServCodeScheduleMap,
  cascadeThreshold: selectCascadeThreshold,
  snowMelt: selectSnowMelt,
  snowDeadline: selectSnowDeadline,
};
