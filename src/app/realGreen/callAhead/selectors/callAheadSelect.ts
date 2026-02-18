import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectCallAheadDocs = (state: AppState) => state.callAhead.callAheadDocs;
const selectCallAheadDocMap = createSelector(
  [selectCallAheadDocs],
  (callAheadDocs) => {
    return new Grouper(callAheadDocs).toUniqueMap((c) => c.callAheadId);
  },
);

export const callAheadSelect = {
  callAheadDocs: selectCallAheadDocs,
  callAheadDocMap: selectCallAheadDocMap,
};
