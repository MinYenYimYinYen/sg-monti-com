import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { flagRuleActions } from "@/app/flagRule/flagRuleSlice";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers in other folders can omit it.
 */
export function useFlagRule({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        flagRuleActions.getAll({
          params: {},
          config: { loadingMsg: "Loading flag rules..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);
}
