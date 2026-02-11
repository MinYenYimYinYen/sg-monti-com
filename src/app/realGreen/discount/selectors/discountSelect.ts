import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";

const selectDiscountDocs = (state: AppState) => state.discount.discountDocs;
const selectDiscountDocMap = createSelector(
  [selectDiscountDocs],
  (discountDocs) => new Grouper(discountDocs).toUniqueMap((d) => d.discountId),
);

export const discountSelect = {
  discountDocs: selectDiscountDocs,
  discountDocMap: selectDiscountDocMap,
};
