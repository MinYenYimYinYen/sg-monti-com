import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectLoadouts = (state: AppState) => state.loadout.loadouts;
const selectFinishLoadout = (state: AppState) => state.loadout.finishLoadout;

/** Map keyed by `"${employeeId}:${routeDate}"` for O(1) lookups. */
const selectLoadoutMap = createSelector([selectLoadouts], (loadouts) =>
  new Grouper(loadouts).toUniqueMap((doc) => `${doc.employeeId}:${doc.routeDate}`),
);

export const loadoutSelect = {
  loadouts: selectLoadouts,
  finishLoadout: selectFinishLoadout,
  loadoutMap: selectLoadoutMap,
};
