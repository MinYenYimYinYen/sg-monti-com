import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { priceIncreaseSettingsActions } from "@/app/priceIncrease/settings/settingsSlice";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers can omit it.
 */
export function usePriceIncreaseSettings({ canLoad = true }: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      priceIncreaseSettingsActions.getAllPriceIncreaseSettings({
        params: {},
        config: { loadingMsg: "Loading price increase settings..." },
      }),
    );
  }, [canLoad, dispatch]);
}
