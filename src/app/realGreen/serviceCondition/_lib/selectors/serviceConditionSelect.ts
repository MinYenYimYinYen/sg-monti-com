import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectServiceConditionDocs = (state: AppState) =>
  state.serviceCondition.serviceConditionDocs;

const selectConditionDocs = (state: AppState) => state.condition.conditionDocs;

const selectConditionDocMap = createSelector(
  [selectConditionDocs],
  (conditionDocs) => {
    return new Grouper(conditionDocs).toUniqueMap((c) => c.conditionId);
  },
);

const selectServiceConditions = createSelector(
  [selectServiceConditionDocs, selectConditionDocMap],
  (serviceConditionDocs, conditionDocMap) => {
    const serviceConditions = serviceConditionDocs.map((serviceConditionDoc) => {
      const conditionDoc = conditionDocMap.get(serviceConditionDoc.conditionId);
      return { ...serviceConditionDoc, conditionDoc };
    });
  }
);

export const serviceConditionSelect = {
};
