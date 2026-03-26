import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectAppMethodDocs = (state: AppState) => state.appMethod.appMethodDocs;

const selectAppMethodMap = createSelector(
  [selectAppMethodDocs],
  (appMethodDocs) =>
    new Grouper(appMethodDocs).toUniqueMap((m) => m.appMethodId),
);

export const appMethodSelect = {
  appMethodDocs: selectAppMethodDocs,
  appMethodMap: selectAppMethodMap,
};
