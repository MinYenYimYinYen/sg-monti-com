import { useAppDispatch } from "@/lib/hooks/redux";
import { loadoutStartActions } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSlice";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

export function useLoadoutStartForm() {
  const dispatch = useAppDispatch();

  const setTech = (tech: string) => {
    dispatch(loadoutStartActions.setTech(tech));
  };

  const setRouteDate = (date: string) => {
    dispatch(loadoutStartActions.setRouteDate(date));
  };

  const setTruckId = (truckId: string | null) => {
    dispatch(loadoutStartActions.setTruckId(truckId));
  };

  const setRideOnId = (rideOnId: string | null) => {
    dispatch(loadoutStartActions.setRideOnId(rideOnId));
  };

  const updateLoadout = (loadout: Partial<LoadoutBase>) => {
    dispatch(loadoutStartActions.updateLoadout(loadout));
  };

  const addPendingProductSlot = (masterId?: number) => {
    dispatch(loadoutStartActions.addPendingProductSlot({ masterId }));
  };

  const updatePendingSlotCategory = (slotId: string, category: string | null) => {
    dispatch(loadoutStartActions.updatePendingSlotCategory({ slotId, category }));
  };

  const removePendingProductSlot = (slotId: string) => {
    dispatch(loadoutStartActions.removePendingProductSlot(slotId));
  };

  const addProductToLoadout = (slotId: string, product: ProductSub | ProductSingle, amount: number | null) => {
    dispatch(loadoutStartActions.addProductToLoadout({ slotId, product, amount }));
  };

  const removeProductFromLoadout = (productId: number, masterId?: number) => {
    dispatch(loadoutStartActions.removeProductFromLoadout({ masterId, productId }));
  };

  const updatePendingSlotProduct = (slotId: string, product: ProductSub | ProductSingle | null) => {
    dispatch(loadoutStartActions.updatePendingSlotProduct({ slotId, product }));
  };

  const updatePendingSlotAmount = (slotId: string, amount: string) => {
    dispatch(loadoutStartActions.updatePendingSlotAmount({ slotId, amount }));
  };

  const clearPendingSlotInputs = (slotId: string) => {
    dispatch(loadoutStartActions.clearPendingSlotInputs(slotId));
  };

  const setPackageSelection = (masterProductId: number, selectedPackageId: string) => {
    dispatch(loadoutStartActions.setPackageSelection({ masterProductId, selectedPackageId }));
  };

  const clearPackageSelections = () => {
    dispatch(loadoutStartActions.clearPackageSelections());
  };

  const markStartLoadoutFieldTouched = (fieldPath: string) => {
    dispatch(loadoutStartActions.markStartLoadoutFieldTouched(fieldPath));
  };

  const setShouldShowAllStartLoadoutIssues = (show: boolean) => {
    dispatch(loadoutStartActions.setShouldShowAllStartLoadoutIssues(show));
  };

  const clearStartForm = () => {
    dispatch(loadoutStartActions.clearStartForm());
  };

  return {
    setTech,
    setRouteDate,
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
    markStartLoadoutFieldTouched,
    setShouldShowAllStartLoadoutIssues,
    clearStartForm,
  };
}
