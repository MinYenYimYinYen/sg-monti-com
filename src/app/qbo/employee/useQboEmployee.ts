import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboEmployeeActions } from "@/app/qbo/employee/qboEmployeeSlice";
import { qboConst } from "@/app/qbo/_lib/qboConst";

/** Loads employees when `autoLoad` is set (cached for the session) and exposes actions only. */
export function useQboEmployee({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        qboEmployeeActions.getQboEmployees({
          params: {},
          config: {
            loadingMsg: "Loading QuickBooks employees...",
            staleTime: qboConst.referenceCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      qboEmployeeActions.getQboEmployees({
        params: {},
        config: { loadingMsg: "Loading QuickBooks employees...", force: true },
      }),
    );

  return { refresh };
}
