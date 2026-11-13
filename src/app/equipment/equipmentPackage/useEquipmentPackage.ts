import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { equipmentPackageActions } from "@/app/equipment/equipmentPackage/equipmentPackageSlice";
import { EquipmentPackageDoc } from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers and callers in other folders can omit it.
 */
export function useEquipmentPackage({ autoLoad, canLoad = true }: { autoLoad?: boolean; canLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        equipmentPackageActions.getAll({
          params: {},
          config: { loadingMsg: "Loading equipment packages..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      equipmentPackageActions.getAll({
        params: {},
        config: { loadingMsg: "Refreshing equipment packages...", force: true },
      }),
    );
  };

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
