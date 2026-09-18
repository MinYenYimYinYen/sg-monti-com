import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { AppState } from "@/store";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { assignmentGroupSelect } from "@/app/assignmentGroup/assignmentGroupSelect";
import { seasonPlanSelect } from "@/app/bizPlan/seasonPlan/seasonPlanSelect";
import { ServCodeDeep } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

// ---------------------------------------------------------------------------
// UrgentReason — why a servCode is in the urgent list
// ---------------------------------------------------------------------------

/**
 * The reason a servCode appears in the urgent list.
 *
 * Priority (checked in order — a servCode matches exactly one):
 *
 *   1. "alwaysAsap" — servCode.alwaysAsap is true. Urgent by nature, not by lateness.
 *      Examples: estimate services, service calls — we don't know when sales will come in,
 *      but when they do we need to act immediately.
 *
 *   2. "overdue" — the group's plannedEnd (from the active SeasonPlan) is in the past.
 *      The SeasonPlan is the sole authoritative deadline. servCode.dateRange is NOT used.
 *
 *   3. "unplanned" — has work remaining but is neither alwaysAsap nor in any group with
 *      a plannedEnd in the active SeasonPlan. This is a signal that the plan is incomplete:
 *      real work exists that the SeasonPlan does not account for.
 *
 * Together these three cases are exhaustive: every servCode with work remaining falls into
 * exactly one category. Nothing falls through silently.
 */
export type UrgentReason =
  | { kind: "alwaysAsap" }
  | { kind: "overdue"; deadline: string }
  | { kind: "unplanned" };

/**
 * A servCode that belongs in the urgent list, paired with the reason it is there.
 */
export type UrgentServCode = {
  servCode: ServCodeDeep;
  reason: UrgentReason;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTIVE_ASAP_STATUSES = getServiceStatuses(["active", "asap"]);

const hasWorkRemaining = (services: { status: string; program: { status: string } }[]) =>
  services.some((s) => ACTIVE_ASAP_STATUSES.includes(s.status) && s.program.status === "9");

// ---------------------------------------------------------------------------
// Build a servCodeId → plannedEnd map from the active SeasonPlan + groupMap.
// This is the single source of truth for deadline dates in the urgent selector.
// servCode.dateRange is NOT used here — the SeasonPlan is authoritative.
// ---------------------------------------------------------------------------

const selectServCodePlannedEndMap = createSelector(
  [seasonPlanSelect.groupScheduleMap, assignmentGroupSelect.groupMap],
  (groupScheduleMap, groupMap): Map<string, string> => {
    const result = new Map<string, string>();
    for (const [groupId, schedule] of groupScheduleMap) {
      const group = groupMap.get(groupId);
      // Fall back to splitting groupId on "+" if group not in map
      const servCodeIds = group?.servCodeIds ?? groupId.split("+");
      for (const servCodeId of servCodeIds) {
        result.set(servCodeId, schedule.plannedEnd);
      }
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectMainDate = (state: AppState) => state.paceCrawler.mainDate;
const selectCheckedServIds = (state: AppState): number[] => state.urgent.checkedServIds;
const selectExpandedServCodeIds = (state: AppState): string[] => state.urgent.expandedServCodeIds;

/**
 * ServCodes that are urgent because alwaysAsap === true and have work remaining.
 * These are urgent by nature — not by lateness.
 */
const selectAlwaysAsapUrgent = createSelector(
  [deepSelect.servCodes],
  (servCodes): UrgentServCode[] =>
    servCodes
      .filter((servCode) => servCode.alwaysAsap && hasWorkRemaining(servCode.services))
      .map((servCode): UrgentServCode => ({
        servCode,
        reason: { kind: "alwaysAsap" },
      })),
);

/**
 * ServCodes that are urgent because their group's plannedEnd (from the active SeasonPlan)
 * is in the past and they still have work remaining.
 *
 * Rules:
 * - alwaysAsap servCodes are excluded (handled by selectAlwaysAsapUrgent).
 * - servCodes with no plannedEnd in the active SeasonPlan are NOT flagged here —
 *   they are handled by selectUnplannedUrgent instead.
 */
const selectOverdueUrgent = createSelector(
  [selectMainDate, deepSelect.servCodes, selectServCodePlannedEndMap],
  (mainDate, servCodes, plannedEndMap): UrgentServCode[] => {
    const result: UrgentServCode[] = [];
    for (const servCode of servCodes) {
      if (servCode.alwaysAsap) continue; // handled separately
      const plannedEnd = plannedEndMap.get(servCode.servCodeId);
      if (!plannedEnd) continue; // no plannedEnd — handled by selectUnplannedUrgent
      if (plannedEnd >= mainDate) continue; // not yet overdue
      if (!hasWorkRemaining(servCode.services)) continue;
      result.push({
        servCode,
        reason: { kind: "overdue", deadline: plannedEnd },
      });
    }
    return result;
  },
);

/**
 * ServCodes that have work remaining but are not accounted for in the active SeasonPlan.
 *
 * A servCode is "unplanned" when:
 * - It is not alwaysAsap (those are handled separately)
 * - It has no plannedEnd in the active SeasonPlan (not in any group, or group not in plan)
 * - It has work remaining
 *
 * This is a signal that the SeasonPlan is incomplete — real work exists that the plan
 * does not account for. Together with alwaysAsap and overdue, these three cases are
 * exhaustive: every servCode with work remaining falls into exactly one category.
 */
const selectUnplannedUrgent = createSelector(
  [deepSelect.servCodes, selectServCodePlannedEndMap],
  (servCodes, plannedEndMap): UrgentServCode[] => {
    const result: UrgentServCode[] = [];
    for (const servCode of servCodes) {
      if (servCode.alwaysAsap) continue; // handled separately
      if (plannedEndMap.has(servCode.servCodeId)) continue; // has a plan — handled by overdue check
      if (!hasWorkRemaining(servCode.services)) continue;
      result.push({
        servCode,
        reason: { kind: "unplanned" },
      });
    }
    return result;
  },
);

/**
 * Combined urgent list in priority order:
 *   1. alwaysAsap — urgent by nature
 *   2. overdue — past their SeasonPlan deadline
 *   3. unplanned — work exists but no SeasonPlan accounts for it
 *
 * This is the primary selector for the Urgent panel.
 */
const selectUrgentServCodes = createSelector(
  [selectAlwaysAsapUrgent, selectOverdueUrgent, selectUnplannedUrgent],
  (asap, overdue, unplanned): UrgentServCode[] => [...asap, ...overdue, ...unplanned],
);

/**
 * Map<servCodeId, UrgentServCode> for O(1) lookups.
 */
const selectUrgentServCodeMap = createSelector(
  [selectUrgentServCodes],
  (urgentServCodes): Map<string, UrgentServCode> => {
    const result = new Map<string, UrgentServCode>();
    for (const entry of urgentServCodes) {
      result.set(entry.servCode.servCodeId, entry);
    }
    return result;
  },
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const urgentServCodesSelect = {
  /** Combined urgent list — alwaysAsap first, then overdue, then unplanned. Primary selector for the Urgent panel. */
  urgentServCodes: selectUrgentServCodes,
  /** Map<servCodeId, UrgentServCode> for O(1) lookups. */
  urgentServCodeMap: selectUrgentServCodeMap,
  /** Checked servIds (checklist state). */
  checkedServIds: selectCheckedServIds,
  /** Expanded accordion servCodeIds (checklist state). */
  expandedServCodeIds: selectExpandedServCodeIds,
};
