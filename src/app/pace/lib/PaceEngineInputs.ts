import { createSelector } from "@reduxjs/toolkit";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";
import { AssignmentPlan } from "@/app/pace/assignmentPlan/AssignmentPlanTypes";
import { GroupSchedule, SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { Holiday } from "@/app/holiday/holidayTypes";
import { paceAssignmentGroupSelect } from "@/app/pace/assignmentGroup/assignmentGroupSelect";
import { paceGroupSequenceSelect } from "@/app/pace/groupSequence/groupSequenceSelect";
import { paceAssignmentPlanSelect } from "@/app/pace/assignmentPlan/assignmentPlanSelect";
import { paceSeasonPlanSelect } from "@/app/pace/seasonPlan/seasonPlanSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { AppState } from "@/store";

// ---------------------------------------------------------------------------
// PaceEngineInputs — the plain object passed to runPaceEngine()
// ---------------------------------------------------------------------------

/**
 * All data the engine needs, assembled from Redux state.
 * The engine is a pure function — it reads no Redux state directly.
 * This type is the contract between the selector layer and the engine.
 */
export type PaceEngineInputs = {
  /** The "as of" date — past/future split point. */
  mainDate: string;

  /** All assignment groups — fully hydrated with sequenceId, plannedStart/End, goalsByEmployee, assignedEmployeeIds. */
  assignmentGroups: AssignmentGroup[];
  /** Map<groupId, AssignmentGroup> for O(1) lookups. */
  assignmentGroupMap: Map<string, AssignmentGroup>;

  /** All group sequences (ordered chains). */
  sequences: GroupSequence[];
  /** Map<groupId, sequenceId> for O(1) lookups. */
  sequenceIdByGroupId: Map<string, string>;

  /** Active scenario's assignment plans. */
  assignmentPlans: AssignmentPlan[];
  /** Map<employeeId, AssignmentPlan>. */
  assignmentsByEmployeeId: Map<string, AssignmentPlan>;
  /** Map<employeeId, Map<groupId, goalDailyPrice | null>>. */
  goalByEmployeeByGroup: Map<string, Map<string, number | null>>;

  /** Active season plan (null if none). */
  activeSeasonPlan: SeasonPlan | null;
  /** Map<groupId, GroupSchedule> from the active season plan. */
  groupScheduleMap: Map<string, GroupSchedule>;
  /** Cascade threshold from the active season plan. */
  cascadeThreshold: number;

  /** All servCodes with their services (deep-hydrated). */
  servCodes: ServCodeDeep[];

  /** All employees (hydrated with PTO, availability, etc.). */
  employees: Employee[];
  /** Map<employeeId, Employee>. */
  employeeMap: Map<string, Employee>;

  /** All holidays. */
  holidays: Holiday[];
  /** Set of holiday dates (weekdays only). */
  holidayDates: Set<string>;
};

// ---------------------------------------------------------------------------
// Input assembly selector
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState): string => state.pace.mainDate;

/**
 * Assembles all engine inputs from Redux state into a single plain object.
 * This is the only selector that `paceEngineSelect` depends on.
 * Memoized — only re-runs when any input selector changes.
 *
 * Normalizes sequences: every AssignmentGroup that is NOT already in a user-created
 * GroupSequence is wrapped in a synthetic single-member GroupSequence. This ensures
 * the engine always operates on a uniform sequence model — no special-casing for
 * standalone groups anywhere downstream.
 */
export const selectPaceEngineInputs = createSelector(
  [
    selectMainDate,
    paceAssignmentGroupSelect.assignmentGroups,
    paceAssignmentGroupSelect.assignmentGroupMap,
    paceGroupSequenceSelect.sequences,
    paceGroupSequenceSelect.sequenceIdByGroupId,
    paceAssignmentPlanSelect.assignmentPlans,
    paceAssignmentPlanSelect.assignmentsByEmployeeId,
    paceAssignmentPlanSelect.goalByEmployeeByGroup,
    paceSeasonPlanSelect.activeSeasonPlan,
    paceSeasonPlanSelect.groupScheduleMap,
    paceSeasonPlanSelect.cascadeThreshold,
    deepSelect.servCodes,
    employeeSelect.employees,
    employeeSelect.employeeMap,
    holidaySelect.all,
    holidaySelect.holidayDates,
  ],
  (
    mainDate,
    assignmentGroups,
    assignmentGroupMap,
    sequences,
    sequenceIdByGroupId,
    assignmentPlans,
    assignmentsByEmployeeId,
    goalByEmployeeByGroup,
    activeSeasonPlan,
    groupScheduleMap,
    cascadeThreshold,
    servCodes,
    employees,
    employeeMap,
    holidays,
    holidayDates,
  ): PaceEngineInputs => {
    // Wrap standalone groups (not in any user-created sequence) as synthetic sequences of 1.
    const sequencedGroupIds = new Set(sequences.flatMap((s) => s.groupIds));
    const syntheticSequences: GroupSequence[] = assignmentGroups
      .filter((g) => !sequencedGroupIds.has(g.groupId))
      .map((g) => ({
        sequenceId: g.groupId + "-seq",
        label: g.label,
        groupIds: [g.groupId],
      }));
    const normalizedSequences: GroupSequence[] = [...sequences, ...syntheticSequences];

    return {
      mainDate,
      assignmentGroups,
      assignmentGroupMap,
      sequences: normalizedSequences,
      sequenceIdByGroupId,
      assignmentPlans,
      assignmentsByEmployeeId,
      goalByEmployeeByGroup,
      activeSeasonPlan,
      groupScheduleMap,
      cascadeThreshold,
      servCodes,
      employees,
      employeeMap,
      holidays,
      holidayDates,
    };
  },
);
