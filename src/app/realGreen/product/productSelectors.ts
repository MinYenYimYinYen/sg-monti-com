import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectProductDocs = (state: AppState) => state.product.productDocs;
const selectProducts = createSelector(
  //Mock Hydration
  [selectProductDocs],
  (productDocs) => productDocs,
);

const selectProductMap = createSelector(
  [selectProducts],
  (products) => new Map(products.map((p) => [p.productId, p])),
);

export const productSelect = {
  products: selectProducts,
  productMap: selectProductMap,
}
