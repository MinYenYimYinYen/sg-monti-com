import { DiscountType, type DiscountDoc } from "@/app/realGreen/discount/DiscountTypes";

/** 5% permanent percent discount applied at the customer level. */
export const sampleCustomerDiscount: DiscountDoc = {
  discountId: "CUST-DISC-5",
  discountType: DiscountType.PERCENT,
  available: true,
  isPermanent: true,
  amount: 5,
  isSurcharge: false,
  description: "5% Customer Discount",
};

/** 10% percent discount applied at the program level (Insect Control). */
export const sampleProgramDiscount: DiscountDoc = {
  discountId: "PROG-DISC-10",
  discountType: DiscountType.PERCENT,
  available: true,
  isPermanent: false,
  amount: 10,
  isSurcharge: false,
  description: "10% Program Discount",
};

/** $15 dollar discount applied to a service outside the discounted program (Lawn Care). */
export const sampleServiceDiscount: DiscountDoc = {
  discountId: "SERV-DISC-15",
  discountType: DiscountType.DOLLAR,
  available: true,
  isPermanent: false,
  amount: 15,
  isSurcharge: false,
  description: "$15 Service Discount",
};

/** 5% percent discount applied to a service inside the discounted program (Insect Control). */
export const sampleServiceDiscount2: DiscountDoc = {
  discountId: "SERV-DISC-5",
  discountType: DiscountType.PERCENT,
  available: true,
  isPermanent: false,
  amount: 5,
  isSurcharge: false,
  description: "5% Service Discount",
};
