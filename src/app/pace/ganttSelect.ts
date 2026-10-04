import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { GroupResult, PoolDaySnapshot } from "@/app/pace/PaceEngineTypes";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";

// ---------------------------------------------------------------------------
// Gantt page selectors
//
// Shapes engine output into Gantt bar data.
// One GanttRow per group — the engine already collapsed servCodes into groups.
// ---------------------------------------------------------------------------

export type GanttRow = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];
  sequenceId: string | null;

  // Plan band (from SeasonPlan)
  plannedStart: string | null;
  plannedEnd: string | null;

  // Crawler projection
  projectedStartDate: string | null;
  projectedEndDate: string | null;

  // Pool history — authoritative date range for bar positioning
  poolHistory: PoolDaySnapshot[];

  // Status
  hasWork: boolean;
  isOnTrack: boolean;
  isOverdue: boolean;
  missingGoals: string[];

  // Pace summary (for popover)
  activePool: number;
  teamGoalDailyRate: number;
  daysNeeded: number | null;
  daysAvailable: number;
  daysEarlyLate: number | null;

  // Crew timeline (for popover)
  crewTimeline: GroupResult["crewTimeline"];
  employeeBreakdowns: GroupResult["employeeBreakdowns"];
};

const selectGanttRows = createSelector(
  [paceEngineSelect],
  (engineResult): GanttRow[] =>
    engineResult.groups.map((group): GanttRow => ({
      groupId: group.groupId,
      label: group.label,
      memberServCodeIds: group.memberServCodeIds,
      sequenceId: group.sequenceId,
      plannedStart: group.plannedStart,
      plannedEnd: group.plannedEnd,
      projectedStartDate: group.projectedStartDate,
      projectedEndDate: group.projectedEndDate,
      poolHistory: group.poolHistory ?? [],
      hasWork: group.hasWork,
      isOnTrack: group.isOnTrack,
      isOverdue: group.isOverdue,
      missingGoals: group.missingGoals,
      activePool: group.activePool,
      teamGoalDailyRate: group.teamGoalDailyRate,
      daysNeeded: group.daysNeeded,
      daysAvailable: group.daysAvailable,
      daysEarlyLate: group.daysEarlyLate,
      crewTimeline: group.crewTimeline,
      employeeBreakdowns: group.employeeBreakdowns,
    })),
);

const selectSeasonStart = createSelector(
  [paceEngineSelect],
  (engineResult) => engineResult.seasonStart,
);

const selectSeasonEnd = createSelector(
  [paceEngineSelect],
  (engineResult) => engineResult.seasonEnd,
);

const selectMainDate = createSelector(
  [paceEngineSelect],
  (engineResult) => engineResult.mainDate,
);

export const ganttSelect = {
  ganttRows: selectGanttRows,
  seasonStart: selectSeasonStart,
  seasonEnd: selectSeasonEnd,
  mainDate: selectMainDate,
  /** Re-exported for the Gantt toolbar. */
  activeSeasonPlan: paceSeasonPlanSelect.activeSeasonPlan,
  snowDeadline: paceSeasonPlanSelect.snowDeadline,
  /** Re-exported for grouping sequential bars. */
  sequenceMap: paceGroupSequenceSelect.sequenceMap,
};
