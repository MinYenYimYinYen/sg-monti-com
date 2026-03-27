import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { EquipmentPackage } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { baseEquipment } from "@/app/equipment/EquipmentTypes";

const selectEquipmentPackageDocs = (state: AppState) =>
  state.equipmentPackage.equipmentPackageDocs;

const selectEquipmentPackageDocMap = createSelector(
  [selectEquipmentPackageDocs],
  (equipmentPackageDocs) =>
    new Grouper(equipmentPackageDocs).toUniqueMap((p) => p.packageId),
);

const selectEquipmentPackages = createSelector(
  [selectEquipmentPackageDocs, equipmentSelect.equipmentMap],
  (docs, equipmentMap) => {
    return docs.map((doc) => {
      const equipmentPackage: EquipmentPackage = {
        ...doc,
        equipments: doc.equipmentIds.map(
          (equipmentId) => equipmentMap.get(equipmentId) ?? baseEquipment,
        ),
      };
      return equipmentPackage;
    });
  },
);

const selectEquipmentPackageMap = createSelector(
  [selectEquipmentPackages],
  (equipmentPackages) =>
    new Grouper(equipmentPackages).toUniqueMap((p) => p.packageId),
);

export const equipmentPackageSelect = {
  // equipmentPackageDocs: selectEquipmentPackageDocs,
  // equipmentPackageDocMap: selectEquipmentPackageDocMap,
  equipmentPackages: selectEquipmentPackages,
  equipmentPackageMap: selectEquipmentPackageMap,
};
