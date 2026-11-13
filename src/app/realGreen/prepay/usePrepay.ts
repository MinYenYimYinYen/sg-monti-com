import { prepayActions } from "@/app/realGreen/prepay/prepaySlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function usePrepay({
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
        prepayActions.getPrepayCodes({
          params: {},
          config: {
            loadingMsg: "Loading prepay codes...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      prepayActions.getPrepayCodes({
        params: {},
        config: {
          loadingMsg: "Loading prepay codes...",
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
