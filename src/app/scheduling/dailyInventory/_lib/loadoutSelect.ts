import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { rehydrateLoadout } from "@/app/scheduling/dailyInventory/_lib/rehydrateLoadout";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import {
  baseLoadout,
  isLoadoutFinalDoc,
  LoadoutDoc,
  LoadoutFinal,
} from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { DeepNonNullable } from "@/lib/primatives/typeUtils/DeepNonNullable";

const selectLoadoutDocs = (state: AppState) => state.loadout.loadoutDocs;
const selectFinishLoadoutDoc = (state: AppState) => state.loadout.finishLoadoutDoc;

/** Map keyed by `"${employeeId}:${routeDate}"` for O(1) lookups. */
const selectLoadoutDocMap = createSelector([selectLoadoutDocs], (loadouts) =>
  new Grouper(loadouts).toUniqueMap(
    (doc) => `${doc.employeeId}:${doc.routeDate}`,
  ),
);

/** Returns the set of employeeIds that have a LoadoutDoc for the given routeDate. */
const selectStartedEmployeeIdsByDate = (routeDate: string) =>
  createSelector([selectLoadoutDocs], (loadouts) => {
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
  createSelector([selectLoadoutDocs], (loadouts) => {
    if (!routeDate) return new Map<string, LoadoutDoc>();
    const map = new Map<string, LoadoutDoc>();
    loadouts.forEach((doc) => {
      if (doc.routeDate === routeDate) map.set(doc.employeeId, doc);
    });
    return map;
  });

/**
 * Returns the sorted union of employeeIds for the Start Loadout card:
 * - Employees from assignments for the date (no status filter — any assigned tech gets a chip)
 * - Employees who have a LoadoutDoc for the date (already started — chip stays visible as "done")
 */
const selectStartEmployeeIdsForDate = (routeDate: string | null) =>
  createSelector(
    [selectLoadoutsByDate(routeDate), assignmentSelect.techsForDate],
    (loadoutsByDate, techsForDate): string[] => {
      const ids = new Set<string>();
      loadoutsByDate.forEach((_, employeeId) => ids.add(employeeId));
      techsForDate.forEach((employeeId) => ids.add(employeeId));
      return Array.from(ids).sort();
    },
  );

/**
 * Returns the sorted union of employeeIds for the Finish Loadout card:
 * - Employees who have a LoadoutDoc for the date (started a loadout, may have finished all services)
 * - Employees from assignments for the date (no status filter)
 */
const selectFinishEmployeeIdsForDate = (routeDate: string | null) =>
  createSelector(
    [selectLoadoutsByDate(routeDate), assignmentSelect.techsForDate],
    (loadoutsByDate, techsForDate): string[] => {
      const ids = new Set<string>();
      loadoutsByDate.forEach((_, employeeId) => ids.add(employeeId));
      techsForDate.forEach((employeeId) => ids.add(employeeId));
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
    return rehydrateLoadout({
      doc,
      productMastersMap,
      productSubsMap,
      equipmentMap,
      appMethodMap,
    });
  },
);

const selectFinishedLoadoutMap = createSelector(
  [
    selectLoadoutDocMap,
    productSelect.productMastersMap,
    productSelect.productSubsMap,
    equipmentSelect.equipmentMap,
    appMethodSelect.appMethodMap,
  ],
  (
    loadoutDocMap,
    productMastersMap,
    productSubsMap,
    equipmentMap,
    appMethodMap,
  ) => {
    const hydrated = new Map<string, LoadoutFinal>();
    loadoutDocMap.forEach((doc, key) => {
      if (!isLoadoutFinalDoc(doc)) return;
      const { masters, singles, subProducts, ...docScalars } = doc;
      const base = rehydrateLoadout({
        doc,
        productMastersMap,
        productSubsMap,
        equipmentMap,
        appMethodMap,
      });
      const loadoutFinal = { ...docScalars, ...base } as LoadoutFinal;
      hydrated.set(key, loadoutFinal);
    });
    return hydrated;
  },
);

const selectGetFinishedLoadout = ({
  employeeId,
  routeDate,
}: {
  employeeId: string;
  routeDate: string;
}) =>
  createSelector([selectFinishedLoadoutMap], (loadoutMap) => {
    const final = loadoutMap.get(`${employeeId}:${routeDate}`);
    if (!final) return null;
    return final;
  });

const selectLoadoutKeys = (state: AppState) => state.loadout.loadoutKeys;

/** Map of employeeId → routeDates[] (sorted descending), derived from loadoutKeys. */
const selectLoadoutKeysByEmployee = createSelector(
  [selectLoadoutKeys],
  (keys) => {
    const map = new Map<string, string[]>();
    for (const key of keys) {
      const existing = map.get(key.employeeId);
      if (existing) {
        existing.push(key.routeDate);
      } else {
        map.set(key.employeeId, [key.routeDate]);
      }
    }
    // Sort each employee's dates descending
    map.forEach((dates) => dates.sort((a, b) => b.localeCompare(a)));
    return map;
  },
);

export const loadoutSelect = {
  loadouts: selectLoadoutDocs,
  finishLoadout: selectFinishLoadoutDoc,
  hydratedFinishLoadout: selectHydratedFinishLoadout,
  loadoutDocMap: selectLoadoutDocMap,
  startedEmployeeIdsByDate: selectStartedEmployeeIdsByDate,
  loadoutsByDate: selectLoadoutsByDate,
  startEmployeeIdsForDate: selectStartEmployeeIdsForDate,
  finishEmployeeIdsForDate: selectFinishEmployeeIdsForDate,
  finishedLoadoutMap: selectFinishedLoadoutMap,
  getFinishedLoadout: selectGetFinishedLoadout,
  loadoutKeys: selectLoadoutKeys,
  loadoutKeysByEmployee: selectLoadoutKeysByEmployee,
};
