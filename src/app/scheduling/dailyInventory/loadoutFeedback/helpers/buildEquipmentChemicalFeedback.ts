import { LoadoutActuals } from "@/app/loadout/LoadoutTypes";
import { EquipmentChemicalFeedback } from "../LoadoutFeedback";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { LoadoutConstituent } from "@/app/loadout/Mixture";

type ScaledConstituent = { constituent: LoadoutConstituent; amount: number };

/** Builds a single EquipmentChemicalFeedback row from a scaled constituent entry. */
function equipmentChemicalFeedbackRow(
  equipmentId: string,
  { constituent, amount }: ScaledConstituent,
): EquipmentChemicalFeedback {
  return {
    equipmentId,
    productId: constituent.product.productId,
    description: constituent.product.description,
    unit: constituent.unit,
    unitConfigDisplay: constituent.product.unitConfigDisplay as UnitConfigDisplay,
    plannedAmount: constituent.plannedAmount,
    actualAmount: amount,
  };
}

/**
 * Returns per-chemical back-calculated amounts for all tank-mixed equipment entries.
 *
 * Individual chemical amounts are derived by scaling each constituent's plannedAmount
 * by the fraction of the tank that was used (startAmount − finishAmount) / plannedAmount.
 * Water carrier (index 0) is excluded.
 */
export function buildEquipmentChemicalFeedback(
  actuals: LoadoutActuals,
): EquipmentChemicalFeedback[] {
  return actuals.equipmentMasters.flatMap((master) =>
    master.equipments.flatMap((equipment) =>
      equipment.plannedMixture
        .scaleByUsage(equipment.startAmount, equipment.finishAmount, equipment.plannedAmount)
        .slice(1) // skip water carrier at index 0
        .map((entry) => equipmentChemicalFeedbackRow(equipment.equipmentId, entry)),
    ),
  );
}
