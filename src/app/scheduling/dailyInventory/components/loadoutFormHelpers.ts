import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

function initializeLoadout(loadoutInventory: LoadoutBase) {
  const initializedLoadout = {
    masters: loadoutInventory.masters.map((master) => ({
      ...master,
      startAmount: null,
      finishAmount: null,
      appMethods: master.appMethods.map((am) => ({
        ...am,
        startAmount: null,
        finishAmount: null,
        subProducts: am.subProducts.map((sub) => ({
          ...sub,
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

export const loadoutHelper = { initializeLoadout };
