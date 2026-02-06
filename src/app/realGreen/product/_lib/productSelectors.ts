import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import {
  ProductMaster,
  ProductSingle,
  ProductSubDoc,
} from "@/app/realGreen/product/_lib/types/ProductTypes";

const selectProductMasterDocs = (state: AppState) =>
  state.product.productMasterDocs;
const selectProductSingleDocs = (state: AppState) =>
  state.product.productSingleDocs;
const selectProductSubDocs = (state: AppState) => state.product.productSubDocs;

const selectMasterMap = createSelector(
  [selectProductMasterDocs],
  (masters) => new Map(masters.map((m) => [m.productId, m])),
);

const selectSingleMap = createSelector(
  [selectProductSingleDocs],
  (singles) => new Map(singles.map((s) => [s.productId, s])),
);

const selectCoreMap = createSelector(
  [selectProductDocs],
  (cores) => new Map(cores.map((c) => [c.productId, c])),
);

const selectProductMasters = createSelector(
  [selectProductMasterDocs],
  (masters) => {
    return masters as ProductMaster[];
  }
)

const selectProductSingles = createSelector(
  [selectProductSingleDocs],
  (singles) => {
    return singles as ProductSingle[];
  }
)

const selectProductSubs = createSelector(
  [selectProductSubDocs],
  (subs) => {
    return subs as ProductSubDoc[];
  }
)



export const productSelect = {
  productMasters: selectProductMasters,
  productSingles: selectProductSingles,
  productSubs: selectProductSubs,

};
