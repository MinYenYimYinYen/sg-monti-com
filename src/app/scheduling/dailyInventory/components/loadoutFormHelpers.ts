import { LoadoutBase, LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

/**
 * Returns the proportion of product remaining (0–1) given start and finish amounts.
 * Returns null if either amount is unavailable (data not yet entered).
 *
 * // todo: EquipmentFinishSection.tsx duplicates this ratio logic inline when propagating
 * // constituent finish amounts. Have it call deriveFinishRatio instead.
 */
function deriveFinishRatio({
  startAmount,
  finishAmount,
}: {
  startAmount: number | null;
  finishAmount: number | null;
}): number | null {
  if (startAmount === null || finishAmount === null) return null;
  if (startAmount === 0) return 0;
  return finishAmount / startAmount;
}

/**
 * Derives the master-level finishAmount (in ksf) from the finish ratio of its
 * primary equipment entry (for liquid masters) or first sub-product (for granular masters).
 * Returns null if the necessary start/finish data is not yet available.
 */
function deriveMasterFinishAmount(master: LoadoutBase["masters"][number]): number | null {
  let ratio: number | null = null;

  if (master.equipments.length > 0) {
    const equipment = master.equipments[0];
    ratio = deriveFinishRatio({ startAmount: equipment.startAmount, finishAmount: equipment.finishAmount });
  } else if (master.subProducts.length > 0) {
    const sub = master.subProducts[0];
    ratio = deriveFinishRatio({ startAmount: sub.startAmount, finishAmount: sub.finishAmount });
  }

  if (ratio === null) return null;
  return Math.round(master.plannedAmount * ratio * 100) / 100;
}

/**
 * Derives the master-level startAmount (in ksf) from the load ratio of its
 * primary equipment entry (for liquid masters) or first sub-product (for granular masters).
 * The ratio is startAmount / plannedAmount — how much of the planned amount was actually loaded.
 * A ratio > 1 is valid (tech loaded more than planned, e.g. leftover from a previous day).
 * Returns null if the necessary data is not yet available.
 */
function deriveMasterStartAmount(master: LoadoutBase["masters"][number]): number | null {
  if (master.equipments.length > 0) {
    const equipment = master.equipments[0];
    if (equipment.startAmount === null || equipment.plannedAmount === 0) return null;
    const ratio = equipment.startAmount / equipment.plannedAmount;
    return Math.round(master.plannedAmount * ratio * 100) / 100;
  } else if (master.subProducts.length > 0) {
    const sub = master.subProducts[0];
    if (sub.startAmount === null || sub.plannedAmount === 0) return null;
    const ratio = sub.startAmount / sub.plannedAmount;
    return Math.round(master.plannedAmount * ratio * 100) / 100;
  }
  return null;
}

function initializeLoadout(loadoutInventory: LoadoutBase) {
  const initializedLoadout = {
    masters: loadoutInventory.masters.map((master) => ({
      ...master,
      // startAmount is derived from the equipment/subProduct start level on serialize.
      // It is not known until the tech enters amounts in the start form.
      startAmount: null,
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
      startAmount: deriveMasterStartAmount(master),
      finishAmount: deriveMasterFinishAmount(master),
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
