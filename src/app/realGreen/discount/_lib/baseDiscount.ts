import {Discount, DiscountType} from "@/app/realGreen/discount/Discount.types";
import {baseNumId, baseStrId} from "@/app/realGreen/_lib/realGreenConst";

export const baseDiscount: Discount = {
  discountId: baseStrId,
  discountType: DiscountType.PERCENT,
  amount: 0,
  isPermanent: false,
  isSurcharge: false,
  available: true,


}