import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { rehydrateLoadout } from "@/app/scheduling/dailyInventory/_lib/rehydrateLoadout";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { baseLoadout } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

const selectLoadouts = (state: AppState) => state.loadout.loadouts;
const selectFinishLoadoutDoc = (state: AppState) => state.loadout.finishLoadout;

/** Map keyed by `"${employeeId}:${routeDate}"` for O(1) lookups. */
const selectLoadoutMap = createSelector([selectLoadouts], (loadouts) =>
  new Grouper(loadouts).toUniqueMap((doc) => `${doc.employeeId}:${doc.routeDate}`),
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
};
