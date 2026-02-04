import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Product } from "@/app/realGreen/product/_lib/ProductTypes";

const selectProductDocs = (state: AppState) => state.product.productDocs;
const selectProducts = createSelector(
  //Mock Hydration
  [selectProductDocs],
  (productDocs) => productDocs as Product[],
);

const selectProductMap = createSelector(
  [selectProducts],
  (products) => new Map(products.map((p) => [p.productId, p])),
);

export const productSelect = {
  products: selectProducts,
  productMap: selectProductMap,
}
