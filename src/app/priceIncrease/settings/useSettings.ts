import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { priceIncreaseSettingsActions } from "@/app/priceIncrease/settings/settingsSlice";

export function usePriceIncreaseSettings() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      priceIncreaseSettingsActions.getAllPriceIncreaseSettings({
        params: {},
        config: { loadingMsg: "Loading price increase settings..." },
      }),
    );
  }, [dispatch]);
}
