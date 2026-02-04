import {
  Discount,
  DiscountCore,
  DiscountDoc,
  DiscountDocProps,
  DiscountProps,
  DiscountType,
} from "@/app/realGreen/discount/Discount.types";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseDiscountCore: DiscountCore = {
  discountId: baseStrId,
  discountType: DiscountType.PERCENT,
  available: true,
  isPermanent: false,
  amount: 0,
  isSurcharge: false,
};

export const baseDiscountDocProps: DiscountDocProps = {
  discountId: baseStrId,
};

export const baseDiscountDoc: DiscountDoc = {
  ...baseDiscountCore,
  ...baseDiscountDocProps,
};

export const baseDiscountProps: DiscountProps = {};

export const baseDiscount: Discount = {
  ...baseDiscountDoc,
  ...baseDiscountProps,
};