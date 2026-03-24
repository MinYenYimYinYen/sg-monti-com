import { useAppDispatch } from "@/lib/hooks/redux";
import {
  techRouteActions,
} from "@/app/scheduling/techRoute/techRouteSlice";
import {
  LoadoutBase,
  LoadoutInventory,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

export function useTechRoute() {
  const dispatch = useAppDispatch();

  const setTech = (tech: string) => {
    dispatch(techRouteActions.setTech(tech));
  }

  const setRouteDate = (date: string) => {
    dispatch(techRouteActions.setRouteDate(date));
  };

  const updateStartLoadout = (loadout: Partial<LoadoutInventory>) => {
    dispatch(techRouteActions.updateStartLoadout(loadout));
  }

  const addPendingProductSlot = (masterId?: number) => {
    dispatch(techRouteActions.addPendingProductSlot({ masterId }));
  };

  const updatePendingSlotCategory = (slotId: string, category: string | null) => {
    dispatch(techRouteActions.updatePendingSlotCategory({ slotId, category }));
  };

  const removePendingProductSlot = (slotId: string) => {
    dispatch(techRouteActions.removePendingProductSlot(slotId));
  };

  const addProductToLoadout = (slotId: string, product: ProductSub | ProductSingle, amount: number) => {
    dispatch(techRouteActions.addProductToLoadout({ slotId, product, amount }));
  };

  const removeProductFromLoadout = (productId: number, masterId?: number) => {
    dispatch(techRouteActions.removeProductFromLoadout({ masterId, productId }));
  };

  const updatePendingSlotProduct = (slotId: string, product: ProductSub | ProductSingle | null) => {
    dispatch(techRouteActions.updatePendingSlotProduct({ slotId, product }));
  };

  const updatePendingSlotAmount = (slotId: string, amount: string) => {
    dispatch(techRouteActions.updatePendingSlotAmount({ slotId, amount }));
  };

  const clearPendingSlotInputs = (slotId: string) => {
    dispatch(techRouteActions.clearPendingSlotInputs(slotId));
  };

  return {
    setRouteDate,
    setTech,
    updateStartLoadout,
    addPendingProductSlot,
    updatePendingSlotCategory,
    removePendingProductSlot,
    addProductToLoadout,
    removeProductFromLoadout,
    updatePendingSlotProduct,
    updatePendingSlotAmount,
    clearPendingSlotInputs,
  };
}
