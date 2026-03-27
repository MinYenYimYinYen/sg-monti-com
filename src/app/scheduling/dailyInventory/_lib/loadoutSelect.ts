import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectLoadouts = (state: AppState) => state.loadout.loadouts;
const selectMyLoadout = (state: AppState) => state.loadout.myLoadout;

/** Map keyed by `"${employeeId}:${routeDate}"` for O(1) lookups. */
const selectLoadoutMap = createSelector([selectLoadouts], (loadouts) =>
  new Grouper(loadouts).toUniqueMap((doc) => `${doc.employeeId}:${doc.routeDate}`),
);

export const loadoutSelect = {
  loadouts: selectLoadouts,
  myLoadout: selectMyLoadout,
  loadoutMap: selectLoadoutMap,
};
