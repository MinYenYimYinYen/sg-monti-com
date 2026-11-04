import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboVendorActions } from "@/app/qbo/vendor/qboVendorSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/** Loads vendors when `autoLoad` is set (cached for the session) and exposes actions only. */
export function useQboVendor({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        qboVendorActions.getQboVendors({
          params: {},
          config: {
            loadingMsg: "Loading QuickBooks vendors...",
            staleTime: qboConst.referenceCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      qboVendorActions.getQboVendors({
        params: {},
        config: { loadingMsg: "Loading QuickBooks vendors...", force: true },
      }),
    );

  return { refresh };
}
