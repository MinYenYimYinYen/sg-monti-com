import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { UrgentGroup } from "@/app/pace/PaceEngineTypes";
import { deepSelect } from "@/app/realGreen/deepSelect";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { priorityServiceSelect } from "@/app/priorityService/priorityServiceSelect";

// ---------------------------------------------------------------------------
// Priorities page selectors
//
// urgentGroups: from the engine (overdue + unplanned groups with work remaining)
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

export const prioritiesSelect = {
  urgentGroups: selectUrgentGroups,
  alwaysAsapServCodes: selectAlwaysAsapServCodes,
  /** Re-exported for the Priority Scheduling column. */
  priorityServices: priorityServiceSelect.priorityServices,
};
