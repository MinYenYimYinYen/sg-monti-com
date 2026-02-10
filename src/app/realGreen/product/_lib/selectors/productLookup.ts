import { createSelector } from "@reduxjs/toolkit";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";

const masterById = (id: number) =>
  createSelector([productSelect.productMastersMap], (mastersMap) => {
    return mastersMap.get(id);
  });

const singleById = (id: number) =>
  createSelector([productSelect.productSinglesMap], (singlesMap) => {
    return singlesMap.get(id);
  });

export const productLookup = { masterById, singleById };
