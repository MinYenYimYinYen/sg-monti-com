/** A sub-product a service is expected to use, worked out from the product rules of its servCode. Never stored. */
export type PlannedProduct = {
  productId: number;
  servId: number;
  amount: number;
  treated: number;
};
