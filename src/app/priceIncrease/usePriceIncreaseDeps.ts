import { useSeasonIncreases } from "@/app/priceIncrease/seasonIncreases/useSeasonIncreases";
import { usePriceIncreaseSettings } from "@/app/priceIncrease/settings/useSettings";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function usePriceIncreaseDeps() {
  useGlobalSettings({ autoLoad: true });
  useSeasonIncreases();
  usePriceIncreaseSettings();
}
