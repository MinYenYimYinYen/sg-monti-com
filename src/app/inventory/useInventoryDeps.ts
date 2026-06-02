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
import {
  loadInventorySession,
  saveInventorySession,
} from "@/lib/inventory/inventorySessionStorage";
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
  // localStorage session persistence
  // ---------------------------------------------------------------------------

  // On mount: restore any in-progress session from today's localStorage entry.
  // Runs once — the empty dependency array is intentional.
  useEffect(() => {
    const saved = loadInventorySession();
    if (saved) {
      dispatch(inventoryActions.restoreSession(saved));
    }
  }, [dispatch]);

  // On every session change: write the current session to localStorage so the
  // user can resume where they left off if they navigate away or close the app.
  const session = useSelector(inventorySelect.session);
  useEffect(() => {
    saveInventorySession(session);
  }, [session]);
}
