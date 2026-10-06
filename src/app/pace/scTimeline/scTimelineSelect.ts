import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { GroupResult, ServCodeTimelineEvent } from "@/app/pace/PaceEngineTypes";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

// ---------------------------------------------------------------------------
// ServCode Timeline page selectors
//
// Pure consumer of engine output — no re-derivation.
// The crew timeline is keyed by groupId (not servCodeId) in the new engine.
// Reads from groupMap (all groups including sequence members).
// ---------------------------------------------------------------------------

/**
 * Map<groupId, ServCodeTimelineEvent[]> — crew transitions per group.
 * Keyed by groupId (the engine's atomic unit), not servCodeId.
 */
const selectCrewTimelines = createSelector(
  [paceEngineSelect],
  (engineResult): Map<string, ServCodeTimelineEvent[]> => {
    const result = new Map<string, ServCodeTimelineEvent[]>();
    for (const group of engineResult.groupMap.values()) {
      if (group.crewTimeline.length > 0) {
        result.set(group.groupId, group.crewTimeline);
      }
    }
    return result;
  },
);

/**
 * Map<groupId, label> — for display in the left panel.
 */
const selectGroupLabelMap = createSelector(
  [paceEngineSelect],
  (engineResult): Map<string, string> =>
    new Map([...engineResult.groupMap.values()].map((g: GroupResult) => [g.groupId, g.label])),
);

export const scTimelineSelect = {
  crewTimelines: selectCrewTimelines,
  groupLabelMap: selectGroupLabelMap,
  /** Re-exported for resolving employeeId → name. */
  employeeMap: employeeSelect.employeeMap,
};
