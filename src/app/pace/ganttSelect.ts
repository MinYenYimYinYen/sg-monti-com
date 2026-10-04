import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { GroupResult, PoolDaySnapshot, SequenceResult } from "@/app/pace/PaceEngineTypes";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";

// ---------------------------------------------------------------------------
// Gantt page selectors
//
// Shapes engine output into Gantt bar data.
// One GanttSequenceRow per sequence — synthetic single-member sequences render
// identically to the old standalone group rows.
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

/**
 * One row per sequence in the Gantt.
 * Synthetic (single-member) sequences render as a plain group row.
 * Multi-member sequences render as a container with stacked member bars.
 */
export type GanttSequenceRow = {
  sequenceId: string;
  label: string;
  /** True for synthetic single-member sequences (standalone groups). */
  isSynthetic: boolean;

  // Sequence-level plan band (first member's plannedStart → last member's plannedEnd)
  plannedStart: string | null;
  plannedEnd: string | null;

  // Sequence-level projection
  projectedStartDate: string | null;
  projectedEndDate: string | null;

  // Merged pool history across all members
  poolHistory: PoolDaySnapshot[];

  // Status
  hasWork: boolean;
  isOverdue: boolean;

  /** Individual member rows — one per group in the sequence. */
  members: GanttRow[];
};

function toGanttRow(group: GroupResult): GanttRow {
  return {
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
  };
}

function toGanttSequenceRow(sequence: SequenceResult): GanttSequenceRow {
  return {
    sequenceId: sequence.sequenceId,
    label: sequence.label,
    isSynthetic: sequence.isSynthetic,
    plannedStart: sequence.plannedStart,
    plannedEnd: sequence.plannedEnd,
    projectedStartDate: sequence.projectedStartDate,
    projectedEndDate: sequence.projectedEndDate,
    poolHistory: sequence.poolHistory,
    hasWork: sequence.hasWork,
    isOverdue: sequence.isOverdue,
    members: sequence.members.map(toGanttRow),
  };
}

const selectGanttSequenceRows = createSelector(
  [paceEngineSelect],
  (engineResult): GanttSequenceRow[] =>
    engineResult.sequenceResults.map(toGanttSequenceRow),
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
  ganttSequenceRows: selectGanttSequenceRows,
  seasonStart: selectSeasonStart,
  seasonEnd: selectSeasonEnd,
  mainDate: selectMainDate,
  /** Re-exported for the Gantt toolbar. */
  activeSeasonPlan: paceSeasonPlanSelect.activeSeasonPlan,
  snowDeadline: paceSeasonPlanSelect.snowDeadline,
};
