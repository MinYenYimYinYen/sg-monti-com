import { createSelector } from "@reduxjs/toolkit";
import { paceEngineSelect } from "@/app/pace/paceEngineSelect";
import { EmployeeTimelineEvent } from "@/app/pace/PaceEngineTypes";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";

// ---------------------------------------------------------------------------
// Employee Timeline page selectors
//
// Pure consumer of engine output — no re-derivation.
// ---------------------------------------------------------------------------

const selectEmployeeTimeline = createSelector(
  [paceEngineSelect],
  (engineResult): Map<string, { date: string; event: EmployeeTimelineEvent }[]> =>
    engineResult.employeeTimeline,
);

export const empTimelineSelect = {
  employeeTimeline: selectEmployeeTimeline,
  /** Re-exported for resolving employeeId → name. */
  employeeMap: employeeSelect.employeeMap,
};
