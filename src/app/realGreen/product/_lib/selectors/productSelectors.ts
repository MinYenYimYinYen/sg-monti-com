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

const selectProductMasterDocMap = createSelector(
  [selectProductMasterDocs],
  (masterDocs) => {
    return new Grouper(masterDocs).toUniqueMap((m) => m.productId);
  },
);

const selectProductSingleDocMap = createSelector(
  [selectProductSingleDocs],
  (singleDocs) => {
    return new Grouper(singleDocs).toUniqueMap((s) => s.productId);
  },
);

const selectProductSubDocs = (state: AppState) => state.product.productSubDocs;

const selectProductSubs = (state: AppState) =>
  selectProductSubDocs(state) as ProductSubDoc[];

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
  [selectProductSingleDocs], (singleDocs) => {
    const hydrated: ProductSingle[] = singleDocs.map((doc) => {
      return {
        ...doc,
        // unit: doc.unitId,
      }
    })
    return hydrated;
  }
)

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

const selectProductCommonDocs = (state: AppState) =>
  state.product.productCommonDocs;

const selectProductCommonDocMap = createSelector(
  [selectProductCommonDocs],
  (commonDocs) => {
    return new Grouper(commonDocs).toUniqueMap((c) => c.productId);
  }
)

export const productSelect = {
  productMasterDocs: selectProductMasterDocs,
  productSingleDocs: selectProductSingleDocs,
  productMasterDocMap: selectProductMasterDocMap,
  productSingleDocMap: selectProductSingleDocMap,

  productMasters: selectProductMasters,
  productSingles: selectProductSingles,
  productSubs: selectProductSubs,
  productMastersMap: selectProductMastersMap,
  productSinglesMap: selectProductSinglesMap,
  productSubsMap: selectProductSubsMap,
  productCommonDocs: selectProductCommonDocs,
  productCommonDocMap: selectProductCommonDocMap,
};
