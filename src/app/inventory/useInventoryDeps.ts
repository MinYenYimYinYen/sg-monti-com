"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useInventory } from "@/app/inventory/useInventory";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { inventoryActions } from "@/app/inventory/inventorySlice";
import { loadInventorySession } from "@/lib/inventory/inventorySessionStorage";

export function useInventoryDeps() {
  const dispatch = useAppDispatch();

  // Loads products + unitConfigs + appMethods — required for the product lists and the
  // Manual add sheet (productSelect.allProductsMap). Monthly Inventory reads no services.
  useProduct({ autoLoad: true });

  // Fetches all InventoryCheckDocs on mount
  useInventory({ autoLoad: true });

  // ---------------------------------------------------------------------------
  // localStorage session restore (one-time, guarded by prevSessionChecked flag)
  // ---------------------------------------------------------------------------

  // prevSessionChecked lives in Redux — survives component remounts (e.g. navigating
  // to [productId] and back). The effect still runs on every mount of this hook,
  // but the flag ensures the restore only happens once per app session.
  const prevSessionChecked = useSelector(inventorySelect.prevSessionChecked);
  useEffect(() => {
    if (prevSessionChecked) return;
    const saved = loadInventorySession();
    if (saved) {
      // restoreSession also sets prevSessionChecked and todayCheckLoaded in the reducer
      dispatch(inventoryActions.restoreSession(saved));
    } else {
      dispatch(inventoryActions.markPrevSessionChecked());
    }
  }, [prevSessionChecked, dispatch]);
}
