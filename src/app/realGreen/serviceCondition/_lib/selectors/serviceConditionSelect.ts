import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { hydrateServiceConditions } from "@/app/realGreen/serviceCondition/_lib/selectors/hydrateServiceConditions";
import { conditionSelect } from "@/app/realGreen/conditionCode/_selectors/conditionSelect";

const selectServiceConditionDocs = (state: AppState) =>
  state.serviceCondition.serviceConditionDocs;

const selectServiceConditions = createSelector(
  [selectServiceConditionDocs, conditionSelect.conditionDocMap],
  (serviceConditionDocs, conditionDocMap) => {
    return hydrateServiceConditions({ serviceConditionDocs, conditionDocMap });
  },
);

const selectServiceConditionsByServId = createSelector(
  [selectServiceConditions],
  (serviceConditions) => {
    return new Grouper(serviceConditions)
      .groupBy((doc) => doc.serviceId)
      .toMap();
  },
);

export const serviceConditionSelect = {
  serviceConditionsByServId: selectServiceConditionsByServId,
};
