import { useSeasonIncreases } from "@/app/priceIncrease/seasonIncreases/useSeasonIncreases";
import { usePriceIncreaseSettings } from "@/app/priceIncrease/settings/useSettings";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export function usePriceIncreaseDeps() {
  useGlobalSettings({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useSeasonIncreases();
  usePriceIncreaseSettings();
}
