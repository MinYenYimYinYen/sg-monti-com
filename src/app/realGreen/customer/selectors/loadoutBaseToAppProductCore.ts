import { LoadoutBase } from "@/app/loadout/LoadoutTypes";
import { AppProductCore } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { WATER_PRODUCT_ID } from "@/app/equipment/waterProduct";

/**
 * loadoutBaseToAppProductCore
 *
 * Flattens a `LoadoutBase` tree into a list of `AppProductCore` records —
 * the same shape produced by the RealGreen API for completed services.
 *
 * Three sources are included:
 *   1. `master.subProducts[]`                    — non-equipment sub-products (manual rates)
 *   2. `master.equipments[].constituents[]`      — all mixture constituents (carrier + solutes)
 *
 * `servId` is stamped on every row so the result can be used directly in
 * `bizPlan` selectors that group by service.
 *
 * This is the bridge between the structured `LoadoutBase` tree and the flat
 * `AppProductCore[]` that `bizPlan` inventory selectors operate on.
 */
export function loadoutBaseToAppProductCore(
  loadout: LoadoutBase,
  servId: number,
): AppProductCore[] {
  return loadout.masters.flatMap((master) => [
    // 1. Non-equipment sub-products (manual rates, not claimed by any equipment entry)
    ...master.subProducts.map((sub) => ({
      productId: sub.productId,
      servId,
      method: "",
      amount: sub.plannedAmount,
      treated: master.plannedAmount,
    })),

    // 2. All mixture constituents (carrier + solutes) for each equipment entry
    ...master.equipments.flatMap((equipment) =>
      equipment.constituents
        .filter((constituent) => constituent.product.productId !== WATER_PRODUCT_ID)
        .map((constituent) => ({
          productId: constituent.product.productId,
          servId,
          method: "",
          amount: constituent.plannedAmount,
          treated: master.plannedAmount,
        })),
    ),

    // 3. Water carrier row — one per equipment (from the carrier constituent)
    ...master.equipments.map((equipment) => {
      const carrier = equipment.constituents[0];
      return {
        productId: carrier.product.productId,
        servId,
        method: "",
        amount: equipment.plannedAmount,
        treated: master.plannedAmount,
      };
    }),
  ]);
}
