import { AppState } from "@/store";
import { SchedPromiseDraft } from "@/app/schedPromise/SchedPromiseTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectSchedPromises= (state: AppState) => state.schedPromise.schedPromises;

const selectSchedPromiseMap = createSelector([selectSchedPromises], (schedPromises) => {
  return new Grouper(schedPromises).toUniqueMap((sp) => `${sp.entityType}:${sp.entityId}`);
});

export const schedPromiseSelect = {
  selectSchedPromises,
  selectSchedPromiseMap,
};