import { createSelector } from "@reduxjs/toolkit";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";
import { UrgentServCode } from "@/app/bizPlan/paceCrawler/devComponents/urgentServCodes/urgentServCodesSelect";
import { paceEngineSelect } from "../paceEngineSelect";

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

/**
 * Overdue engine groups expanded into UrgentServCode[] for use with UrgentChecklistContent.
 *
 * Each overdue group's member servCodes are resolved from deepSelect.servCodes.
 * ServCodeIds are deduplicated — a servCode that appears in multiple overdue groups
 * is only included once (with the earliest deadline).
 * Only servCodes with active work remaining are included.
 * Reads memberServCodeIds directly from UrgentGroup — no groupMap lookup needed.
 */
const selectOverdueGroupServCodes = createSelector(
  [paceEngineSelect.paceEngineResult, deepSelect.servCodes],
  (engineResult, allServCodes): UrgentServCode[] => {
    const servCodeMap = new Map(allServCodes.map((sc) => [sc.servCodeId, sc]));
    // Track seen servCodeIds to deduplicate across groups
    const seenServCodeIds = new Set<string>();
    const result: UrgentServCode[] = [];

    for (const urgentGroup of engineResult.urgentGroups) {
      if (urgentGroup.reason.kind !== "overdue") continue;

      for (const servCodeId of urgentGroup.memberServCodeIds) {
        if (seenServCodeIds.has(servCodeId)) continue;
        seenServCodeIds.add(servCodeId);

        const servCode = servCodeMap.get(servCodeId);
        if (!servCode) continue;
        const activeServices = servCode.services.filter((s) =>
          ACTIVE_ASAP_STATUSES.includes(s.status),
        );
        if (activeServices.length === 0) continue;

        // TEMP DEBUG — log the straggler M4 service so we can look it up in the CRM
        if (servCodeId === "M4" && activeServices.length === 1) {
          console.log("[DEBUG M4 straggler]", activeServices.map((s) => ({
            servId: s.servId,
            status: s.status,
            custId: s.custId,
          })));
        }

        result.push({ servCode, reason: urgentGroup.reason });
      }
    }

    return result;
  },
);

export const prioritiesSelect = {
  urgentGroups: paceEngineSelect.urgentGroups,
  overdueGroupServCodes: selectOverdueGroupServCodes,
  alwaysAsapServCodes: selectAlwaysAsapServCodes,
  /** Re-exported for the Priority Scheduling column. */
  priorityServices: priorityServiceSelect.priorityServices,
};
