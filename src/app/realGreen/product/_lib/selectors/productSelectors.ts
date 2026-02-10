import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductSubDoc } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Grouper } from "@/lib/Grouper";
import { baseProductSub } from "@/app/realGreen/product/_lib/baseProduct";

const selectProductMasterDocs = (state: AppState) =>
  state.product.productMasterDocs;
const selectProductSingleDocs = (state: AppState) =>
  state.product.productSingleDocs;
const selectProductSubDocs = (state: AppState) => state.product.productSubDocs;

const selectProductSubs = createSelector([selectProductSubDocs], (subs) => {
  return subs as ProductSubDoc[];
});

const selectProductSubsMap = createSelector([selectProductSubs], (subs) => {
  return new Grouper(subs).toUniqueMap((s) => s.productId);
});

const selectProductMasters = createSelector(
  [selectProductMasterDocs, selectProductSubsMap],
  (masterDocs, subsMap) => {
    const masters: ProductMaster[] = masterDocs.map((doc) => {
      return {
        ...doc,
        subProducts: doc.subProductIds.map((subId) => {
          return subsMap.get(subId) || baseProductSub;
        }),
      };
    });
    return masters;
  },
);

const selectProductSingles = createSelector(
  [selectProductSingleDocs],
  (singles) => {
    return singles as ProductSingle[];
  },
);

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

export const productSelect = {
  productMasters: selectProductMasters,
  productSingles: selectProductSingles,
  productSubs: selectProductSubs,
  productMastersMap: selectProductMastersMap,
  productSinglesMap: selectProductSinglesMap,
  productSubsMap: selectProductSubsMap,
};
