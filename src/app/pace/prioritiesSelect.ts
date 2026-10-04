import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { UrgentGroup } from "@/app/pace/PaceEngineTypes";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { UrgentServCode } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentServCodesSelect";

// ---------------------------------------------------------------------------
// Priorities page selectors
//
// urgentGroups: from the engine (overdue + unplanned groups with work remaining)
// overdueGroupServCodes: overdue engine groups expanded to UrgentServCode[] for UrgentChecklistContent
// alwaysAsapServCodes: read directly from deepSelect — excluded from the engine
// priorityServices: from priorityServiceSelect (manually flagged)
// ---------------------------------------------------------------------------

const ACTIVE_ASAP_STATUSES = getServiceStatuses(["active", "asap"]);

/**
 * ServCodes with alwaysAsap === true that have actionable services.
 * These are excluded from the engine entirely and surfaced here independently.
 */
const selectAlwaysAsapServCodes = createSelector(
  [deepSelect.servCodes],
  (servCodes) =>
    servCodes.filter(
      (sc) =>
        sc.alwaysAsap &&
        sc.services.some(
          (s) =>
            ACTIVE_ASAP_STATUSES.includes(s.status) && s.program.status === "9",
        ),
    ),
);

/** Overdue and unplanned groups from the engine. */
const selectUrgentGroups = createSelector(
  [paceEngineSelect],
  (engineResult): UrgentGroup[] => engineResult.urgentGroups,
);

/**
 * Overdue engine groups expanded into UrgentServCode[] for use with UrgentChecklistContent.
 *
 * Each overdue group's member servCodes are resolved from deepSelect.servCodes.
 * ServCodeIds are deduplicated — a servCode that appears in multiple overdue groups
 * is only included once (with the earliest deadline).
 * Only servCodes with active work remaining are included.
 */
const selectOverdueGroupServCodes = createSelector(
  [paceEngineSelect, deepSelect.servCodes],
  (engineResult, allServCodes): UrgentServCode[] => {
    const servCodeMap = new Map(allServCodes.map((sc) => [sc.servCodeId, sc]));
    // Track seen servCodeIds to deduplicate across groups
    const seenServCodeIds = new Set<string>();
    const result: UrgentServCode[] = [];

    for (const urgentGroup of engineResult.urgentGroups) {
      if (urgentGroup.reason.kind !== "overdue") continue;
      const group = engineResult.groupMap.get(urgentGroup.groupId);
      if (!group) continue;

      if (group.label.includes("CC3")) {
        console.log(`[prioritiesSelect] Processing overdue group: ${group.label}, memberServCodeIds:`, group.memberServCodeIds);
      }

      for (const servCodeId of group.memberServCodeIds) {
        if (seenServCodeIds.has(servCodeId)) continue;
        seenServCodeIds.add(servCodeId);

        const servCode = servCodeMap.get(servCodeId);
        if (!servCode) {
          if (group.label.includes("CC3")) console.log(`[prioritiesSelect] servCode not found in deepSelect: ${servCodeId}`);
          continue;
        }
        const hasActive = servCode.services.some((s) => ACTIVE_ASAP_STATUSES.includes(s.status));
        if (!hasActive) {
          if (group.label.includes("CC3")) console.log(`[prioritiesSelect] servCode ${servCodeId} has no active services (statuses: ${[...new Set(servCode.services.map(s => s.status))].join(",")})`);
          continue;
        }

        result.push({ servCode, reason: urgentGroup.reason });
      }
    }

    return result;
  },
);

export const prioritiesSelect = {
  urgentGroups: selectUrgentGroups,
  overdueGroupServCodes: selectOverdueGroupServCodes,
  alwaysAsapServCodes: selectAlwaysAsapServCodes,
  /** Re-exported for the Priority Scheduling column. */
  priorityServices: priorityServiceSelect.priorityServices,
};
