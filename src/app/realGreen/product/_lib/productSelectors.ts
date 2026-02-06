import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Grouper } from "@/lib/Grouper";

const selectProductMasterDocs = (state: AppState) =>
  state.product.productMasterDocs;
const selectProductSingleDocs = (state: AppState) =>
  state.product.productSingleDocs;
const selectProductSubDocs = (state: AppState) => state.product.productSubDocs;

const selectProductMasters = createSelector(
  [selectProductMasterDocs],
  (masters) => {
    return masters as ProductMaster[];
  },
);

const selectProductSingles = createSelector(
  [selectProductSingleDocs],
  (singles) => {
    return singles as ProductSingle[];
  },
);

const selectProductSubs = createSelector([selectProductSubDocs], (subs) => {
  return subs as ProductSubDoc[];
});

const selectProductMastersMap = createSelector(
  [selectProductMasters],
  (masters) => {
    return new Grouper(masters).toUniqueMap((m) => m.productId);
  },
);

const selectProductSinglesMap = createSelector(
  [selectProductSingles],
  (singles) => {
    return new Grouper(singles).toUniqueMap((s) => s.productId);
  },
);

const selectProductSubsMap = createSelector([selectProductSubs], (subs) => {
  return new Grouper(subs).toUniqueMap((s) => s.productId);
});

export const productSelect = {
  productMasters: selectProductMasters,
  productSingles: selectProductSingles,
  productSubs: selectProductSubs,
  productMastersMap: selectProductMastersMap,
  productSinglesMap: selectProductSinglesMap,
  productSubsMap: selectProductSubsMap,
};
