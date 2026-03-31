import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { AppProductCore } from "@/app/realGreen/_lib/subTypes/AppProduct";

/**
 * loadoutBaseToAppProductCore
 *
 * Flattens a `LoadoutBase` tree into a list of `AppProductCore` records —
 * the same shape produced by the RealGreen API for completed services.
 *
 * Three sources are included:
 *   1. `master.subProducts[]`                    — non-equipment sub-products (manual rates)
 *   2. `master.equipments[].subProducts[]` — mixed products inside each equipment
 *   3. `master.equipments[]`               — the water carrier row (one per equipment)
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
      amount: sub.plannedAmount,
      size: master.plannedAmount,
    })),

    // 2. Mixed sub-products inside each equipment
    ...master.equipments.flatMap((equipment) =>
      equipment.subProducts.map((sub) => ({
        productId: sub.productId,
        servId,
        amount: sub.plannedAmount,
        size: master.plannedAmount,
      })),
    ),

    // 3. Water carrier row — one per equipment
    ...master.equipments.map((equipment) => ({
      productId: equipment.carrierProductId,
      servId,
      amount: equipment.plannedAmount,
      size: master.plannedAmount,
    })),
  ]);
}
