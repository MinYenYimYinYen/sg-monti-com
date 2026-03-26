import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

type EquipmentEntrySub =
  LoadoutBase["masters"][number]["equipmentEntries"][number]["subProducts"][number];

function initializeLoadout(loadoutInventory: LoadoutBase) {
  const initializedLoadout = {
    masters: loadoutInventory.masters.map((master) => ({
      ...master,
      startAmount: null,
      finishAmount: null,
      equipmentEntries: master.equipmentEntries.map((entry) => ({
        ...entry,
        startAmount: null,
        finishAmount: null,
        subProducts: entry.subProducts.map((sub) => ({
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
