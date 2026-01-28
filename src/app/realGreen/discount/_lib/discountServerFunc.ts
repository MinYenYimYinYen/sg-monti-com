import {
  DiscountCore,
  DiscountDoc,
  DiscountRaw,
} from "@/app/realGreen/discount/Discount.types";

function remapDiscount(raw: DiscountRaw): DiscountCore {
  return {
    discountId: raw.id,
    discountType: raw.dollarDiscount,
    amount: raw.discountAmount,
    isPermanent: raw.permanent,
    isSurcharge: raw.isSurcharge,
    available: raw.available,
  };
}

export function remapDiscounts(raw: DiscountRaw[]): DiscountCore[] {
  return raw.map((d) => remapDiscount(d));
}

export async function extendDiscounts(
  discounts: DiscountCore[],
): Promise<DiscountDoc[]> {
  return discounts as DiscountDoc[];
}
