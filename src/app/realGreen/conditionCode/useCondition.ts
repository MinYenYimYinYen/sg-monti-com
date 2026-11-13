import { conditionActions } from "./conditionSlice";
import { realGreenConst } from "../_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useCondition({
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
        conditionActions.getConditionDocs({
          params: {},
          config: {
            loadingMsg: "Loading conditions...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      conditionActions.getConditionDocs({
        params: {},
        config: {
          loadingMsg: "Loading conditions...",
          force: true,
        },
      }),
    );
  };

  return { refresh };
}
