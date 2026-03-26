import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectEquipmentDocs = (state: AppState) => state.equipment.equipmentDocs;

const selectEquipmentMap = createSelector(
  [selectEquipmentDocs],
  (equipmentDocs) =>
    new Grouper(equipmentDocs).toUniqueMap((e) => e.equipmentId),
);

export const equipmentSelect = {
  equipmentDocs: selectEquipmentDocs,
  equipmentMap: selectEquipmentMap,
};
