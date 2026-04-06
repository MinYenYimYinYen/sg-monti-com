import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { rehydrateLoadout } from "@/app/scheduling/dailyInventory/_lib/rehydrateLoadout";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { baseLoadout, LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";

const selectLoadouts = (state: AppState) => state.loadout.loadouts;
const selectFinishLoadoutDoc = (state: AppState) => state.loadout.finishLoadout;

/** Map keyed by `"${employeeId}:${routeDate}"` for O(1) lookups. */
const selectLoadoutMap = createSelector([selectLoadouts], (loadouts) =>
  new Grouper(loadouts).toUniqueMap((doc) => `${doc.employeeId}:${doc.routeDate}`),
);

/** Returns the set of employeeIds that have a LoadoutDoc for the given routeDate. */
const selectStartedEmployeeIdsByDate = (routeDate: string) =>
  createSelector([selectLoadouts], (loadouts) => {
    const ids = new Set<string>();
    loadouts.forEach((doc) => {
      if (doc.routeDate === routeDate) ids.add(doc.employeeId);
    });
    return ids;
  });

/**
 * Returns a map of employeeId → LoadoutDoc for all loadouts on the given date.
 * Components can use `isLoadoutFinal(doc)` to distinguish started-but-unfinished from fully finished.
 */
const selectLoadoutsByDate = (routeDate: string | null) =>
  createSelector([selectLoadouts], (loadouts) => {
    if (!routeDate) return new Map<string, LoadoutDoc>();
    const map = new Map<string, LoadoutDoc>();
    loadouts.forEach((doc) => {
      if (doc.routeDate === routeDate) map.set(doc.employeeId, doc);
    });
    return map;
  });

/**
 * Returns the sorted union of employeeIds for the Start Loadout card:
 * - Employees from cover sheets for the date (have pending/printed services)
 * - Employees who have a LoadoutDoc for the date (already started — chip stays visible as "done")
 */
const selectStartEmployeeIdsForDate = (routeDate: string | null) =>
  createSelector(
    [selectLoadoutsByDate(routeDate), coverSheetsSelect.servicesByDateAndEmployee],
    (loadoutsByDate, servicesByDateAndEmployee): string[] => {
      const ids = new Set<string>();
      loadoutsByDate.forEach((_, employeeId) => ids.add(employeeId));
      if (routeDate) {
        servicesByDateAndEmployee.get(routeDate)?.forEach((_, employeeId) => ids.add(employeeId));
      }
      return Array.from(ids).sort();
    },
  );

/**
 * Returns the sorted union of employeeIds for the Finish Loadout card:
 * - Employees who have a LoadoutDoc for the date (started a loadout, may have finished all services)
 * - Employees from cover sheets for the date (have pending/printed services)
 */
const selectFinishEmployeeIdsForDate = (routeDate: string | null) =>
  createSelector(
    [selectLoadoutsByDate(routeDate), coverSheetsSelect.servicesByDateAndEmployee],
    (loadoutsByDate, servicesByDateAndEmployee): string[] => {
      const ids = new Set<string>();
      loadoutsByDate.forEach((_, employeeId) => ids.add(employeeId));
      if (routeDate) {
        servicesByDateAndEmployee.get(routeDate)?.forEach((_, employeeId) => ids.add(employeeId));
      }
      return Array.from(ids).sort();
    },
  );

/** Derives a fully hydrated LoadoutBase from the persisted LoadoutDoc. */
const selectHydratedFinishLoadout = createSelector(
  [
    selectFinishLoadoutDoc,
    equipmentSelect.equipmentMap,
    appMethodSelect.appMethodMap,
    productSelect.productMastersMap,
    productSelect.productSubsMap,
  ],
  (doc, equipmentMap, appMethodMap, productMastersMap, productSubsMap) => {
    if (!doc) return baseLoadout;
    return rehydrateLoadout({ doc, productMastersMap, productSubsMap, equipmentMap, appMethodMap });
  },
);

export const loadoutSelect = {
  loadouts: selectLoadouts,
  finishLoadout: selectFinishLoadoutDoc,
  hydratedFinishLoadout: selectHydratedFinishLoadout,
  loadoutMap: selectLoadoutMap,
  startedEmployeeIdsByDate: selectStartedEmployeeIdsByDate,
  loadoutsByDate: selectLoadoutsByDate,
  startEmployeeIdsForDate: selectStartEmployeeIdsForDate,
  finishEmployeeIdsForDate: selectFinishEmployeeIdsForDate,
};
