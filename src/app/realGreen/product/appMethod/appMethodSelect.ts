import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { AppMethod } from "./AppMethodTypes";
import { baseUnit, Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

const selectAppMethodDocs = (state: AppState) => state.appMethod.appMethodDocs;

const selectAppMethodDocMap = createSelector(
  [selectAppMethodDocs],
  (appMethodDocs) =>
    new Grouper(appMethodDocs).toUniqueMap((m) => m.appMethodId),
);

// Extract units from product docs to create a unitMap
const selectProductSubDocs = (state: AppState) => state.product.productSubDocs;

const selectUnitMap = createSelector(
  [selectProductSubDocs],
  (productSubDocs) => {
    const unitMap = new Map<number, Unit>();
    productSubDocs.forEach((subDoc) => {
      unitMap.set(subDoc.unitId, subDoc.unit);
    });
    return unitMap;
  },
);

const selectAppMethods = createSelector(
  [selectAppMethodDocs, selectUnitMap],
  (appMethodDocs, unitMap) => {
    const appMethods: AppMethod[] = appMethodDocs.map((doc) => ({
      ...doc,
      flowRateUnit: unitMap.get(doc.flowRateUnitId) || baseUnit,
    }));
    return appMethods;
  },
);

const selectAppMethodMap = createSelector([selectAppMethods], (appMethods) =>
  new Grouper(appMethods).toUniqueMap((m) => m.appMethodId),
);

export const appMethodSelect = {
  appMethods: selectAppMethods,
  appMethodMap: selectAppMethodMap,
};
