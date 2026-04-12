import { LoadoutActuals } from "@/app/loadout/LoadoutTypes";
import { EquipmentMixFeedback } from "../LoadoutFeedback";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

type ActualsEquipmentMaster = LoadoutActuals["equipmentMasters"][number];
type Equipment = ActualsEquipmentMaster["equipments"][number];

/**
 * Sums service.size for all matched services that used the first non-water constituent.
 * All constituents share the same treated area per service, so the first solute is sufficient.
 */
function completedKsfForMaster(master: ActualsEquipmentMaster): number {
  const firstConstituentId = master.equipments[0]?.constituents[1]?.product.productId;
  if (firstConstituentId === undefined) return 0;

  let completedKsf = 0;
  for (const service of master.matchedServices) {
    const ap = service.production?.usedAppProducts?.find(
      (p) => p.productId === firstConstituentId,
    );
    if (ap) completedKsf += service.size;
  }
  return completedKsf;
}

/** Builds a single EquipmentMixFeedback row from an equipment entry and its master's completedKsf. */
function equipmentMixFeedbackRow(equipment: Equipment, completedKsf: number): EquipmentMixFeedback {
  const totalMixUsed = equipment.startAmount - equipment.finishAmount;
  const { coverage } = equipment.appMethod;
  // coverage.volume / coverage.area = gallons per ksf (same unit as startAmount/finishAmount)
  const coverageRate = coverage.area > 0 ? coverage.volume / coverage.area : 0;
  const expectedMixUsed =
    completedKsf > 0 && coverageRate > 0 ? coverageRate * completedKsf : null;
  const mixVsExpected = expectedMixUsed !== null ? totalMixUsed - expectedMixUsed : null;

  return {
    equipmentId: equipment.equipmentId,
    completedKsf,
    plannedAmount: equipment.plannedAmount,
    startAmount: equipment.startAmount,
    finishAmount: equipment.finishAmount,
    totalMixUsed,
    expectedMixUsed,
    mixVsExpected,
    unitConfigDisplay: equipment.constituents[0].product.unitConfigDisplay as UnitConfigDisplay,
  };
}

/**
 * Derives per-equipment tank-level feedback rows from LoadoutActuals.
 * completedKsf is the sum of service.size for matched services that used the first
 * non-water constituent (all constituents share the same treated area per service).
 */
export function buildEquipmentMixFeedback(actuals: LoadoutActuals): EquipmentMixFeedback[] {
  return actuals.equipmentMasters.flatMap((master) => {
    const completedKsf = completedKsfForMaster(master);
    return master.equipments.map((equipment) => equipmentMixFeedbackRow(equipment, completedKsf));
  });
}
