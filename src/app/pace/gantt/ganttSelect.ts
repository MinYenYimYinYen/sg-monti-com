import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { GroupResult, SequenceResult } from "@/app/pace/PaceEngineTypes";
import { CrawlerDay } from "@/app/pace/lib/crawlerDay/CrawlerDay";
import { CrawlerDayUtils } from "@/app/pace/lib/crawlerDay/crawlerDayUtils";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";

// ---------------------------------------------------------------------------
// Gantt page selectors
//
// Shapes engine output into Gantt bar data.
// One GanttSequenceRow per sequence — synthetic single-member sequences render
// identically to the old standalone group rows.
//
// Bar positioning reads from crawlerDays (CrawlerDay[]) — the canonical crawl
// output. Summary fields (pace analysis, crew) remain on GroupResult.
// ---------------------------------------------------------------------------

export type GanttRow = {
  groupId: string;
  label: string;
  memberServCodeIds: string[];
  sequenceId: string | null;

  // Plan band (from SeasonPlan)
  plannedStart: string | null;
  plannedEnd: string | null;

  // Crawler projection dates (for popover display)
  projectedStartDate: string | null;
  projectedEndDate: string | null;

  /**
   * CrawlerDay[] filtered to days where this group appears.
   * Used for bar positioning (first/last date) and past/future split.
   * Replaces poolHistory: PoolDaySnapshot[].
   */
  crawlerDays: CrawlerDay[];

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

  /**
   * CrawlerDay[] filtered to days where any member of this sequence appears.
   * Used for sequence-level chart bounds.
   */
  crawlerDays: CrawlerDay[];

  // Status
  hasWork: boolean;
  isOverdue: boolean;

  /** Individual member rows — one per group in the sequence. */
  members: GanttRow[];
};

function toGanttRow(group: GroupResult, crawlerDays: CrawlerDay[], mainDate: string): GanttRow {
  const groupDays = CrawlerDayUtils.daysForGroup(crawlerDays, group.groupId);

  // Use CrawlerDayUtils for correct as-of-mainDate pace analysis.
  // GroupResult.activePool, daysNeeded, daysEarlyLate, isOnTrack are post-simulation
  // values (drained to 0 by the future phase) and are marked @deprecated.
  const pace = CrawlerDayUtils.groupPaceAsOf(
    crawlerDays,
    group.groupId,
    mainDate,
    group.teamGoalDailyRate,
    group.daysAvailable,
  );

  return {
    groupId: group.groupId,
    label: group.label,
    memberServCodeIds: group.memberServCodeIds,
    sequenceId: group.sequenceId,
    plannedStart: group.plannedStart,
    plannedEnd: group.plannedEnd,
    projectedStartDate: group.projectedStartDate,
    projectedEndDate: group.projectedEndDate,
    crawlerDays: groupDays,
    hasWork: CrawlerDayUtils.groupHasWorkAsOf(crawlerDays, group.groupId, mainDate),
    isOnTrack: pace.isOnTrack,
    isOverdue: group.isOverdue,
    missingGoals: group.missingGoals,
    activePool: pace.poolRemaining,
    teamGoalDailyRate: group.teamGoalDailyRate,
    daysNeeded: pace.daysNeeded,
    daysAvailable: group.daysAvailable,
    daysEarlyLate: pace.daysEarlyLate,
    crewTimeline: group.crewTimeline,
    employeeBreakdowns: group.employeeBreakdowns,
  };
}

function toGanttSequenceRow(
  sequence: SequenceResult,
  crawlerDays: CrawlerDay[],
  mainDate: string,
): GanttSequenceRow {
  const isSynthetic = sequence.isSynthetic;
  const sequenceDays = isSynthetic && sequence.members[0]
    ? CrawlerDayUtils.daysForGroup(crawlerDays, sequence.members[0].groupId)
    : CrawlerDayUtils.daysForSequence(crawlerDays, sequence.sequenceId);

  return {
    sequenceId: sequence.sequenceId,
    label: sequence.label,
    isSynthetic,
    plannedStart: sequence.plannedStart,
    plannedEnd: sequence.plannedEnd,
    projectedStartDate: sequence.projectedStartDate,
    projectedEndDate: sequence.projectedEndDate,
    crawlerDays: sequenceDays,
    hasWork: sequence.hasWork,
    isOverdue: sequence.isOverdue,
    members: sequence.members.map((group) => toGanttRow(group, crawlerDays, mainDate)),
  };
}

const selectGanttSequenceRows = createSelector(
  [paceEngineSelect],
  (engineResult): GanttSequenceRow[] =>
    engineResult.sequenceResults.map((sequence) =>
      toGanttSequenceRow(sequence, engineResult.crawlerDays, engineResult.mainDate),
    ),
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
