export enum DiscountType {
  PERCENT = 1,
  DOLLAR = 2,
}

export type DiscountRaw = {
  anybranch: boolean;
  available: boolean;
  availableOnHandheld: boolean;
  availableOnWeb: boolean;
  branches?: number[];
  commercialAccount?: string;
  discountAmount: number; // percent is whole number (10% off = 10)
  discountDescFrench?: string;
  discountDescSpanish?: string;
  discountDescription: string;
  dollarDiscount: DiscountType; //enum not provided by api docs, but this reflects the api response
  id: string;
  isSurcharge: boolean;
  permanent: boolean;
  promoCode?: string;
  residentialAccount?: string;
};

export type DiscountCore = {
  discountId: string;
  discountType: DiscountType;
  available: boolean;
  isPermanent: boolean;
  amount: number;
  isSurcharge: boolean;
};

export type DiscountDocProps = {
  discountId: string;
};

export type DiscountDoc = DiscountCore & DiscountDocProps;

export type DiscountProps = {};

export type Discount = DiscountDoc & DiscountProps;
