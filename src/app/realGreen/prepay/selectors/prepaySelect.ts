import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectPrepayDocs = (state: AppState) => state.prepay.prepayDocs;

const selectPrepayDocMap = createSelector(
  [selectPrepayDocs],
  (prepayDocs) => new Grouper(prepayDocs).toUniqueMap((p) => p.prepayId),
);

export const prepaySelect = {
  prepayDocs: selectPrepayDocs,
  prepayDocMap: selectPrepayDocMap,
};
