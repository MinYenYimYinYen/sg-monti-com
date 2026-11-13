import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { equipmentActions } from "@/app/equipment/equipmentSlice";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { useSelector } from "react-redux";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers and callers in other folders can omit it.
 */
export function useEquipment({ autoLoad, canLoad = true }: { autoLoad?: boolean; canLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        equipmentActions.getAll({
          params: {},
          config: { loadingMsg: "Loading equipment..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      equipmentActions.getAll({
        params: {},
        config: { loadingMsg: "Refreshing equipment...", force: true },
      }),
    );
  };

  const upsertEquipment = (equipment: EquipmentDoc) => {
    dispatch(
      equipmentActions.upsert({
        params: { equipment },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const deleteEquipment = ({
    equipment,
    clearReferences,
  }: {
    equipment: EquipmentDoc;
    clearReferences?: boolean;
  }) =>
    dispatch(
      equipmentActions.deleteOne({
        params: { equipment, clearReferences },
        config: { showLoading: false, force: true },
      }),
    );

  return { refresh, upsertEquipment, deleteEquipment };
}
