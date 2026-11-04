import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboAccountActions } from "@/app/qbo/account/qboAccountSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/** Loads accounts when `autoLoad` is set (cached for the session) and exposes actions only. */
export function useQboAccount({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        qboAccountActions.getQboAccounts({
          params: {},
          config: {
            loadingMsg: "Loading QuickBooks accounts...",
            staleTime: qboConst.referenceCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      qboAccountActions.getQboAccounts({
        params: {},
        config: { loadingMsg: "Loading QuickBooks accounts...", force: true },
      }),
    );

  return { refresh };
}
