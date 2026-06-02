"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { inventoryActions } from "@/app/inventory/inventorySlice";
import { InventoryCheckDoc, ProductCount } from "@/app/inventory/InventoryTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { clearInventorySession } from "@/lib/inventory/inventorySessionStorage";

export function useInventory({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        inventoryActions.getInventoryChecks({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const addProduct = (productId: number) =>
    dispatch(inventoryActions.addProductToSession(productId));

  const removeProduct = (productId: number) =>
    dispatch(inventoryActions.removeProductFromSession(productId));

  const addCount = (productId: number, count: ProductCount) =>
    dispatch(inventoryActions.addCount({ productId, count }));

  const removeCount = (productId: number, index: number) =>
    dispatch(inventoryActions.removeCount({ productId, index }));

  const setDateRange = (range: TRange<string> | null) =>
    dispatch(inventoryActions.setDateRange(range));

  const loadCheckIntoSession = (date: string) =>
    dispatch(inventoryActions.loadCheckIntoSession(date));

  const save = async (check: InventoryCheckDoc) => {
    await dispatch(
      inventoryActions.saveInventoryCheck({
        params: { check },
        config: { force: true },
      }),
    ).unwrap();
    dispatch(inventoryActions.clearSession());
    clearInventorySession();
  };

  return { addProduct, removeProduct, addCount, removeCount, setDateRange, loadCheckIntoSession, save };
}
