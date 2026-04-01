import { LoadoutBase, LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

function initializeLoadout(loadoutInventory: LoadoutBase) {
  const initializedLoadout = {
    masters: loadoutInventory.masters.map((master) => ({
      ...master,
      // startAmount is the planned ksf for this master — always known from the route.
      startAmount: master.plannedAmount,
      finishAmount: null,
      equipments: master.equipments.map((equipment) => ({
        ...equipment,
        startAmount: null,
        finishAmount: null,
        constituents: equipment.constituents.map((constituent) => ({
          ...constituent,
          startAmount: null,
          finishAmount: null,
        })),
      })),
      subProducts: master.subProducts.map((sub) => ({
        ...sub,
        startAmount: null,
        finishAmount: null,
      })),
    })),
    singles: [],
    subProducts: [],
  };
  return initializedLoadout;
}

/**
 * serializeLoadout — converts the runtime LoadoutBase + form metadata into a LoadoutDoc
 * suitable for persistence. Strips all hydrated objects, keeping only IDs and amounts.
 */
function serializeLoadout(params: {
  loadout: LoadoutBase;
  employeeId: string;
  routeDate: string;
  truckId: string;
  rideOnId: string;
  isStored: boolean;
}): LoadoutDoc {
  const { loadout, employeeId, routeDate, truckId, rideOnId, isStored } = params;

  return {
    employeeId,
    routeDate,
    truckId,
    rideOnId,
    isStored,

    masters: loadout.masters.map((master) => ({
      productId: master.productId,
      plannedAmount: master.plannedAmount,
      startAmount: master.startAmount,
      finishAmount: master.finishAmount,
      unitId: master.unitId,
      equipments: master.equipments.map((equipment) => ({
        equipmentId: equipment.equipmentId,
        appMethodId: equipment.appMethod.appMethodId,
        plannedAmount: equipment.plannedAmount,
        startAmount: equipment.startAmount,
        finishAmount: equipment.finishAmount,
        constituents: equipment.constituents.map((constituent) => ({
          productId: constituent.product.productId,
          plannedAmount: constituent.plannedAmount,
          startAmount: constituent.startAmount,
          finishAmount: constituent.finishAmount,
          unitId: constituent.unitId,
        })),
      })),
      subProducts: master.subProducts.map((sub) => ({
        productId: sub.productId,
        plannedAmount: sub.plannedAmount,
        startAmount: sub.startAmount,
        finishAmount: sub.finishAmount,
        unitId: sub.unitId,
      })),
    })),
    singles: loadout.singles.map((single) => ({
      productId: single.productId,
      startAmount: single.startAmount,
      finishAmount: single.finishAmount,
      unitId: single.unitId,
    })),
    subProducts: loadout.subProducts.map((sub) => ({
      productId: sub.productId,
      startAmount: sub.startAmount,
      finishAmount: sub.finishAmount,
      unitId: sub.unitId,
    })),
  };
}

export const loadoutHelper = { initializeLoadout, serializeLoadout };
