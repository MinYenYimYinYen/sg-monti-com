import { useSeasonIncreases } from "@/app/priceIncrease/seasonIncreases/useSeasonIncreases";
import { usePriceIncreaseSettings } from "@/app/priceIncrease/settings/useSettings";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";

export function usePriceIncreaseDeps() {
  useGlobalSettings({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useActiveCustomers({ autoLoad: true });
  useSeasonIncreases();
  usePriceIncreaseSettings();
}
