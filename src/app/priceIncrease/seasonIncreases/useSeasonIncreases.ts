import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { seasonIncreasesActions } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers can omit it.
 */
export function useSeasonIncreases({ canLoad = true }: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad) return;
    dispatch(
      seasonIncreasesActions.getAllSeasonIncreases({
        params: {},
        config: { loadingMsg: "Loading season increases..." },
      }),
    );
  }, [canLoad, dispatch]);
}
