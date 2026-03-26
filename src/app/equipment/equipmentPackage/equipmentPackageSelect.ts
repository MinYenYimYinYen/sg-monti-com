import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectEquipmentPackageDocs = (state: AppState) =>
  state.equipmentPackage.equipmentPackageDocs;

const selectEquipmentPackageMap = createSelector(
  [selectEquipmentPackageDocs],
  (equipmentPackageDocs) =>
    new Grouper(equipmentPackageDocs).toUniqueMap((p) => p.packageId),
);

export const equipmentPackageSelect = {
  equipmentPackageDocs: selectEquipmentPackageDocs,
  equipmentPackageMap: selectEquipmentPackageMap,
};
