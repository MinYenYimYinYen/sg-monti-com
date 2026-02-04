import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

const selectProductMasterDocs = (state: AppState) =>
  state.product.productMasterDocs;
const selectProductSingleDocs = (state: AppState) =>
  state.product.productSingleDocs;
const selectProductCores = (state: AppState) => state.product.productCores;

// Derive subs from cores and master relationships
const selectProductSubDocs = createSelector(
  [selectProductMasterDocs, selectProductCores],
  (masters, cores) => {
    const allSubIds = new Set(masters.flatMap((m) => m.subProductIds));
    return cores.filter((c) => allSubIds.has(c.productId));
  },
);

const selectMasterMap = createSelector(
  [selectProductMasterDocs],
  (masters) => new Map(masters.map((m) => [m.productId, m])),
);

const selectSingleMap = createSelector(
  [selectProductSingleDocs],
  (singles) => new Map(singles.map((s) => [s.productId, s])),
);

const selectCoreMap = createSelector(
  [selectProductCores],
  (cores) => new Map(cores.map((c) => [c.productId, c])),
);

export const productSelect = {
  productMasterDocs: selectProductMasterDocs,
  productSingleDocs: selectProductSingleDocs,
  productCores: selectProductCores,
  productSubDocs: selectProductSubDocs, // Derived selector
  masterMap: selectMasterMap,
  singleMap: selectSingleMap,
  coreMap: selectCoreMap,
};
