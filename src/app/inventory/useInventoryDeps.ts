"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";
import { useInventory } from "@/app/inventory/useInventory";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { inventoryActions } from "@/app/inventory/inventorySlice";
import { loadInventorySession } from "@/lib/inventory/inventorySessionStorage";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

const INVENTORY_CONTEXTS: CustomerContextMode[] = ["recentProduction"];

export function useInventoryDeps() {
  const dispatch = useAppDispatch();

  // Tells centralCustomerSlice to merge from the recentProduction source slice
  useCustomerContext({ contexts: INVENTORY_CONTEXTS });

  // Loads progCodes + servCodes — required for loadoutInventory hydration in centralSelectors
  useProgServ({ autoLoad: true });

  // Loads products + unitConfigs + appMethods — required for production hydration
  // and for the Manual add sheet (productSelect.allProductsMap)
  useProduct({ autoLoad: true });

  // Fetches all InventoryCheckDocs on mount
  useInventory({ autoLoad: true });

  // Reads the committed dateRange from Redux (set when user clicks Search).
  // Re-fetches recentProduction whenever dateRange changes — null-safe, no-ops when null.
  const dateRange = useSelector(inventorySelect.sessionDateRange);
  useRecentProduction(dateRange);

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
