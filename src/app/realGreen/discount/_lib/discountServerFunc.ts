import {
  DiscountCore,
  DiscountDoc,
  DiscountDocProps,
  DiscountRaw,
} from "@/app/realGreen/discount/DiscountTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

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
  return extendEntities<DiscountCore, DiscountDocProps, DiscountDoc>({
    cores: discounts,
    idField: "discountId",
    baseDocProps: {} as DiscountDocProps,
  });
}
