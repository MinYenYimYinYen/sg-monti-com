import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { flagRuleActions } from "@/app/flagRule/flagRuleSlice";

export function useFlagRule({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        flagRuleActions.getAll({
          params: {},
          config: { loadingMsg: "Loading flag rules..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);
}
