import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

const selectCallLogStatuses = (state: AppState) =>
  state.callLogStatus.callLogStatuses;

// Keyed by code for O(1) lookup when resolving call log status.
// Filters out the base sentinel (baseStrId) to avoid polluting the map.
const selectCallLogStatusMap = createSelector(
  [selectCallLogStatuses],
  (statuses) =>
    new Grouper(statuses.filter((s) => s.code !== baseStrId)).toUniqueMap((s) => s.code),
);

export const callLogStatusSelect = {
  callLogStatuses: selectCallLogStatuses,
  statusMap: selectCallLogStatusMap,
};
