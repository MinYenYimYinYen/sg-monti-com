"use client";

import { useSelector } from "react-redux";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";
import { useInventory } from "@/app/inventory/useInventory";
import { inventorySelect } from "@/app/inventory/inventorySelect";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";

const INVENTORY_CONTEXTS: CustomerContextMode[] = ["recentProduction"];

export function useInventoryDeps() {
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
}
