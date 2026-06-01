import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";

const selectJavelinState = (state: AppState) => state.javelin;

const selectFiles = createSelector(
  [selectJavelinState],
  (javelin) => javelin.files,
);

const selectJournalNoPrefix = createSelector(
  [selectJavelinState],
  (javelin) => javelin.journalNoPrefix,
);

const selectSavedAccountMap = createSelector(
  [selectJavelinState],
  (javelin) => javelin.savedAccountMap,
);

const selectLiveAccountMap = createSelector(
  [selectJavelinState],
  (javelin) => javelin.liveAccountMap,
);

const selectHasUnsavedMappingChanges = createSelector(
  [selectSavedAccountMap, selectLiveAccountMap],
  (saved, live) => !deepEqual(saved, live, []),
);

const selectUnmappedAccounts = createSelector(
  [selectFiles, selectLiveAccountMap],
  (files, liveAccountMap) => {
    const allAccounts = new Set<string>();
    for (const file of files) {
      for (const row of file.rows) {
        allAccounts.add(row.account);
      }
    }
    // Unmapped = no entry at all, or entry exists but qbName is empty
    return [...allAccounts].filter(
      (account) => !liveAccountMap[account]?.qbName,
    );
  },
);

const selectAllAccountsMapped = createSelector(
  [selectUnmappedAccounts],
  (unmapped) => unmapped.length === 0,
);

export const javelinSelect = {
  files: selectFiles,
  journalNoPrefix: selectJournalNoPrefix,
  savedAccountMap: selectSavedAccountMap,
  liveAccountMap: selectLiveAccountMap,
  hasUnsavedMappingChanges: selectHasUnsavedMappingChanges,
  unmappedAccounts: selectUnmappedAccounts,
  allAccountsMapped: selectAllAccountsMapped,
};
