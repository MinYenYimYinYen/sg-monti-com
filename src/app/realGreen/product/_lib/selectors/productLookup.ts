import { createSelector } from "@reduxjs/toolkit";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import {
  baseProductMaster,
  baseProductSingle,
  baseProductSub,
} from "@/app/realGreen/product/_lib/baseProduct";

const masterById = (id: number) =>
  createSelector([productSelect.productMastersMap], (mastersMap) => {
    return mastersMap.get(id) ?? baseProductMaster;
  });

const singleById = (id: number) =>
  createSelector([productSelect.productSinglesMap], (singlesMap) => {
    return singlesMap.get(id) ?? baseProductSingle;
  });

const subById = (id: number) => {
  return createSelector([productSelect.productSubsMap], (subsMap) => {
    return subsMap.get(id) ?? baseProductSub;
  });
};

export const productLookup = { masterById, singleById, subById };
