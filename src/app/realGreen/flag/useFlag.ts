import { flagActions } from "@/app/realGreen/flag/flagSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useFlag({
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
        flagActions.getFlagDocs({
          params: {},
          config: {
            loadingMsg: "Loading flags...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      flagActions.getFlagDocs({
        params: {},
        config: {
          loadingMsg: "Loading flags...",
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
