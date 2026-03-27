import { useAppDispatch } from "@/lib/hooks/redux";
import {
  loadoutFormActions,
} from "@/app/scheduling/dailyInventory/_lib/loadoutFormSlice";
import {
  LoadoutBase,
} from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

export function useLoadoutForm() {
  const dispatch = useAppDispatch();

  const setTech = (tech: string) => {
    dispatch(loadoutFormActions.setTech(tech));
  }

  const setRouteDate = (date: string) => {
    dispatch(loadoutFormActions.setRouteDate(date));
  };

  const updateLoadout = (loadout: Partial<LoadoutBase>) => {
    dispatch(loadoutFormActions.updateLoadout(loadout));
  }

  const addPendingProductSlot = (masterId?: number) => {
    dispatch(loadoutFormActions.addPendingProductSlot({ masterId }));
  };

  const updatePendingSlotCategory = (slotId: string, category: string | null) => {
    dispatch(loadoutFormActions.updatePendingSlotCategory({ slotId, category }));
  };

  const removePendingProductSlot = (slotId: string) => {
    dispatch(loadoutFormActions.removePendingProductSlot(slotId));
  };

  const addProductToLoadout = (slotId: string, product: ProductSub | ProductSingle, amount: number | null) => {
    dispatch(loadoutFormActions.addProductToLoadout({ slotId, product, amount }));
  };

  const removeProductFromLoadout = (productId: number, masterId?: number) => {
    dispatch(loadoutFormActions.removeProductFromLoadout({ masterId, productId }));
  };

  const updatePendingSlotProduct = (slotId: string, product: ProductSub | ProductSingle | null) => {
    dispatch(loadoutFormActions.updatePendingSlotProduct({ slotId, product }));
  };

  const updatePendingSlotAmount = (slotId: string, amount: string) => {
    dispatch(loadoutFormActions.updatePendingSlotAmount({ slotId, amount }));
  };

  const clearPendingSlotInputs = (slotId: string) => {
    dispatch(loadoutFormActions.clearPendingSlotInputs(slotId));
  };

  const setTruckId = (truckId: string | null) => {
    dispatch(loadoutFormActions.setTruckId(truckId));
  };

  const setRideOnId = (rideOnId: string | null) => {
    dispatch(loadoutFormActions.setRideOnId(rideOnId));
  };

  const setPackageSelection = (masterProductId: number, selectedPackageId: string) => {
    dispatch(loadoutFormActions.setPackageSelection({ masterProductId, selectedPackageId }));
  };

  const clearPackageSelections = () => {
    dispatch(loadoutFormActions.clearPackageSelections());
  };

  return {
    setRouteDate,
    setTech,
    setTruckId,
    setRideOnId,
    updateLoadout,
    addPendingProductSlot,
    updatePendingSlotCategory,
    removePendingProductSlot,
    addProductToLoadout,
    removeProductFromLoadout,
    updatePendingSlotProduct,
    updatePendingSlotAmount,
    clearPendingSlotInputs,
    setPackageSelection,
    clearPackageSelections,
  };
}
