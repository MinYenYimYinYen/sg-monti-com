import { useSeasonIncreases } from "@/app/priceIncrease/seasonIncreases/useSeasonIncreases";
import { usePriceIncreaseSettings } from "@/app/priceIncrease/settings/useSettings";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { usePriceIncreaseCustomers } from "@/app/priceIncrease/usePriceIncreaseCustomers";
import { usePriceTable } from "@/app/realGreen/priceTable/usePriceTable";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { usePriceIncreaseCustFlags } from "@/app/priceIncrease/usePriceIncreaseCustFlags";

export function usePriceIncreaseDeps() {
  useCustomerContext({ contexts: ["priceIncrease"] });
  usePriceIncreaseCustomers({ autoLoad: true });
  useGlobalSettings({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useSeasonIncreases();
  usePriceIncreaseSettings();
  usePriceTable({ autoLoad: true});
  usePriceIncreaseCustFlags();
}