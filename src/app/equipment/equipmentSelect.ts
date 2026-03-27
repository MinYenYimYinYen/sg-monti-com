import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { appMethodSelect } from "@/app/appMethod/appMethodSelect";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { baseAppMethod } from "@/app/appMethod/AppMethodTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

const selectEquipmentDocs = (state: AppState) => state.equipment.equipmentDocs;

const selectEquipmentDocMap = createSelector(
  [selectEquipmentDocs],
  (equipmentDocs) =>
    new Grouper(equipmentDocs).toUniqueMap((e) => e.equipmentId),
);

const selectEquipments = createSelector(
  [selectEquipmentDocs, appMethodSelect.appMethodMap],
  (equipmentDocs, appMethodMap) => {
    return equipmentDocs.map((equipmentDoc) => {
      const appMethod =
        appMethodMap.get(equipmentDoc.defaultAppMethodId) ?? baseAppMethod;

      const equipment: Equipment = {
        ...equipmentDoc,
        showFlOz: equipmentDoc.showFlOz ?? false,
        appMethod,
      };

      return equipment;
    });
  },
);

const selectEquipmentMap = createSelector(
  [selectEquipments],
  (equipments) => new Grouper(equipments).toUniqueMap((e) => e.equipmentId),
);

export const equipmentSelect = {
  equipmentDocs: selectEquipmentDocs,
  equipmentDocMap: selectEquipmentDocMap,
  equipments: selectEquipments,
  equipmentMap: selectEquipmentMap,
};
