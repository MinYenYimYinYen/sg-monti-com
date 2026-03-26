import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { equipmentPackageActions } from "@/app/equipment/equipmentPackage/equipmentPackageSlice";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

export function useEquipmentPackage({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        equipmentPackageActions.getAll({
          params: {},
          config: { loadingMsg: "Loading equipment packages..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      equipmentPackageActions.getAll({
        params: {},
        config: { loadingMsg: "Refreshing equipment packages...", force: true },
      }),
    );

  const upsertEquipmentPackage = (equipmentPackage: EquipmentPackageDoc) =>
    dispatch(
      equipmentPackageActions.upsert({
        params: { equipmentPackage },
        config: { showLoading: false, force: true },
      }),
    );

  const deleteEquipmentPackage = ({
    equipmentPackage,
    clearReferences,
  }: {
    equipmentPackage: EquipmentPackageDoc;
    clearReferences?: boolean;
  }) =>
    dispatch(
      equipmentPackageActions.deleteOne({
        params: { equipmentPackage, clearReferences },
        config: { showLoading: false, force: true },
      }),
    );

  return { refresh, upsertEquipmentPackage, deleteEquipmentPackage };
}
