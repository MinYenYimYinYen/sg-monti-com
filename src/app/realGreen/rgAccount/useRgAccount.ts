import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { rgAccountActions } from "@/app/realGreen/rgAccount/rgAccountSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useRgAccount({
  autoLoad,
  canLoad = true,
}: {
  autoLoad: boolean;
  canLoad?: boolean;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        rgAccountActions.getRgAccounts({
          params: {},
          config: {
            loadingMsg: "Loading RealGreen accounts...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      rgAccountActions.getRgAccounts({
        params: {},
        config: {
          loadingMsg: "Loading RealGreen accounts...",
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
