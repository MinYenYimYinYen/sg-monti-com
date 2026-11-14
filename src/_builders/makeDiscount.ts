import type { DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";
import { baseDiscountDoc } from "@/app/realGreen/discount/_lib/baseDiscount";

let discountIdCounter = 1;

/**
 * Defaults to a 0% non-permanent PERCENT discount. `amount` is a whole-number percentage
 * for `DiscountType.PERCENT` (10 means 10%) and dollars for `DiscountType.DOLLAR`.
 *
 * Each discount gets its own `discountId` unless one is given: `makeCustomer` wires a
 * discount to its customer, program or service by id, so two discounts in one tree that
 * shared an id would silently replace each other.
 */
export function makeDiscount(overrides: Partial<DiscountDoc> = {}): DiscountDoc {
  return {
    ...baseDiscountDoc,
    discountId: `DISC-${discountIdCounter++}`,
    ...overrides,
  };
}
