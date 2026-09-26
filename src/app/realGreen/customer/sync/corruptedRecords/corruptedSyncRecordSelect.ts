import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectCorruptedSyncRecords = (state: AppState) =>
  state.corruptedSyncRecord.corruptedSyncRecords;

/** All records grouped by timestamp — primary grouping for the investigation UI. */
const selectByTimestamp = createSelector(
  [selectCorruptedSyncRecords],
  (records) => new Grouper(records).groupBy((r) => r.timestamp).toMap(),
);

/** All records grouped by entityType. */
const selectByEntityType = createSelector(
  [selectCorruptedSyncRecords],
  (records) => new Grouper(records).groupBy((r) => r.entityType).toMap(),
);

/** All distinct timestamps, sorted descending (most recent first). */
const selectTimestamps = createSelector(
  [selectByTimestamp],
  (byTimestamp) => [...byTimestamp.keys()].sort((a, b) => b.localeCompare(a)),
);

export const corruptedSyncRecordSelect = {
  corruptedSyncRecords: selectCorruptedSyncRecords,
  byTimestamp: selectByTimestamp,
  byEntityType: selectByEntityType,
  timestamps: selectTimestamps,
};
