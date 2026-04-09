import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { equipmentActions } from "@/app/equipment/equipmentSlice";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";
import { useSelector } from "react-redux";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";

export function useEquipment({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        equipmentActions.getAll({
          params: {},
          config: { loadingMsg: "Loading equipment..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      equipmentActions.getAll({
        params: {},
        config: { loadingMsg: "Refreshing equipment...", force: true },
      }),
    );

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
