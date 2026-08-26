import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { SeasonPlan, ServCodeSchedule } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";

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
 * Map of servCodeId → ServCodeSchedule from the active SeasonPlan.
 * Returns an empty map when no plan is active.
 */
const selectServCodeScheduleMap = createSelector(
  [selectActiveSeasonPlan],
  (activeSeasonPlan): Map<string, ServCodeSchedule> => {
    if (!activeSeasonPlan) return new Map();
    const result = new Map<string, ServCodeSchedule>();
    for (const schedule of activeSeasonPlan.servCodeSchedules) {
      result.set(schedule.servCodeId, schedule);
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
  servCodeScheduleMap: selectServCodeScheduleMap,
  cascadeThreshold: selectCascadeThreshold,
  snowDeadline: selectSnowDeadline,
};
