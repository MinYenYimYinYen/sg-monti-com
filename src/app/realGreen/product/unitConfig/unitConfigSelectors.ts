import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectUnitConfigs = (state: AppState) => state.unitConfig.configs;

const selectUnitConfigMap = createSelector([selectUnitConfigs], (configs) =>
  new Grouper(configs).toUniqueMap((c) => c.productId),
);

export const unitConfigSelect = {
  unitConfigs: selectUnitConfigs,
  unitConfigMap: selectUnitConfigMap,
}
