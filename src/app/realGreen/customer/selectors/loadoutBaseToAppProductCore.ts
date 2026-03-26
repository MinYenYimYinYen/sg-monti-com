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
 *   2. `master.equipmentEntries[].subProducts[]` — mixed products inside each equipment entry
 *   3. `master.equipmentEntries[]`               — the water carrier row (one per entry)
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

    // 2. Mixed sub-products inside each equipment entry
    ...master.equipmentEntries.flatMap((entry) =>
      entry.subProducts.map((sub) => ({
        productId: sub.productId,
        servId,
        amount: sub.plannedAmount,
        size: master.plannedAmount,
      })),
    ),

    // 3. Water carrier row — one per equipment entry
    ...master.equipmentEntries.map((entry) => ({
      productId: entry.mixProductId,
      servId,
      amount: entry.plannedAmount,
      size: master.plannedAmount,
    })),
  ]);
}
