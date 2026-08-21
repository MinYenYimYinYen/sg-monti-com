import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useZipCode } from "@/app/realGreen/zipCode/useZipCode";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";

// Module-level constant — stable reference across renders.
// useCustomerContext's useEffect depends on this array; a new reference every
// render would cause switchContexts to fire repeatedly, clearing the central maps.
const CUSTOMER_VALUE_CONTEXTS: CustomerContextMode[] = [
  "active",
  "multiSeasonProduction",
];

export function useCustomerValueDeps() {
  // Register both contexts so their data merges into the central maps.
  // Neither context auto-loads — the user triggers loading from the layout header
  // via "Load via API" or "Load JSON".
  useCustomerContext({ contexts: CUSTOMER_VALUE_CONTEXTS });
  useProgServ({ autoLoad: true });
  usePriceTable({ autoLoad: true });
  useZipCode({ autoLoad: true });
  useFlag({ autoLoad: true });
}
