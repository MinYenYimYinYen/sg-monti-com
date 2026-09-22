import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { CallLogReason } from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";

const selectCallLogReasonDocs = (state: AppState) =>
  state.callLogReason.callLogReasonDocs;

// Hydrated CallLogReason — currently a direct cast since CallLogReasonProps is empty.
// When Props gains fields, add hydration logic here.
const selectCallLogReasons = createSelector(
  [selectCallLogReasonDocs],
  (docs): CallLogReason[] => docs as CallLogReason[],
);

// Keyed by reasonId (number) for O(1) lookup when resolving note reasons.
const selectCallLogReasonMap = createSelector(
  [selectCallLogReasons],
  (reasons) => new Grouper(reasons.filter((r) => r.reasonId > 0)).toUniqueMap((r) => r.reasonId),
);

// Keyed by reasonId as string — useful if the raw reason field arrives as a string.
const selectCallLogReasonStringMap = createSelector(
  [selectCallLogReasons],
  (reasons) => new Grouper(reasons.filter((r) => r.reasonId > 0)).toUniqueMap((r) => String(r.reasonId)),
);

export const callLogReasonSelect = {
  callLogReasonDocs: selectCallLogReasonDocs,
  callLogReasons: selectCallLogReasons,
  reasonMap: selectCallLogReasonMap,
  reasonStringMap: selectCallLogReasonStringMap,
};
