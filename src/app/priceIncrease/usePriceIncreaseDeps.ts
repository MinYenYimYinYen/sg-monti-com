import { useSeasonIncreases } from "@/app/priceIncrease/seasonIncreases/useSeasonIncreases";
import { usePriceIncreaseSettings } from "@/app/priceIncrease/settings/useSettings";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { usePriceIncreaseCustomers } from "@/app/priceIncrease/usePriceIncreaseCustomers";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { usePriceIncreaseCustFlags } from "@/app/priceIncrease/usePriceIncreaseCustFlags";

/** Which of the loads this hook fires the caller may make. Absent means allowed. */
type CanLoad = {
  increasePlans?: boolean;
  globalSettings?: boolean;
};

/**
 * `canLoad` comes from the layout, because hooks expose actions only and do not select. The layout
 * only mounts for a user who holds `increaseSettings.read`, so that load needs no flag. The
 * RealGreen loads below are not declared yet (deferred), so they are ungated.
 */
export function usePriceIncreaseDeps({ canLoad = {} }: { canLoad?: CanLoad } = {}) {
  const { increasePlans: canLoadIncreasePlans = true, globalSettings: canLoadGlobalSettings = true } = canLoad;
  useCustomerContext({ contexts: ["priceIncrease"] });
  usePriceIncreaseCustomers({ autoLoad: true, canLoadGlobalSettings });
  useGlobalSettings({ autoLoad: true, canLoad: canLoadGlobalSettings });
  useProgServ({ autoLoad: true });
  useSeasonIncreases({ canLoad: canLoadIncreasePlans });
  usePriceIncreaseSettings();
  usePriceTable({ autoLoad: true});
  usePriceIncreaseCustFlags();
}