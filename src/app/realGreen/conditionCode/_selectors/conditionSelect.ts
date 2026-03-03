import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectConditionDocs = (state: AppState) => state.condition.conditionDocs;

const selectConditionDocMap = createSelector(
  [selectConditionDocs],
  (conditionDocs) => {
    return new Grouper(conditionDocs).toUniqueMap;
  },
);





export const conditionSelect = {
  conditionDocMap: selectConditionDocMap,
};
