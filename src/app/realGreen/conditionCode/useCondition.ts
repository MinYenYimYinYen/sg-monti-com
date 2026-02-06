import { conditionActions } from "./conditionSlice";
import { realGreenConst } from "../_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useCondition({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
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
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      conditionActions.getConditionDocs({
        params: {},
        config: {
          loadingMsg: "Loading conditions...",
          force: true,
        },
      }),
    );

  return { refresh };
}
