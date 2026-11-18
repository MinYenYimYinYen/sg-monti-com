/**
 * RealGreen records tax in three numbered slots: a customer's `taxID1..3` and a service's
 * `taxAmount1..3` / `taxableAmount1..3`. Slot n on a service is the tax for the code in slot n on
 * the customer, so both sides use this one type and a gap (a code in slot 1, none in 2, one in 3)
 * keeps its position instead of shifting.
 */
export type TaxSlot = 1 | 2 | 3;

export const TAX_SLOTS: readonly TaxSlot[] = [1, 2, 3];

/** One value per slot, in slot order. A tuple, so it stores as a plain three-element array. */
export type TaxSlotTuple<T> = [T, T, T];

export function bySlot<T>({ values, slot }: { values: TaxSlotTuple<T>; slot: TaxSlot }): T {
  return values[slot - 1];
}
