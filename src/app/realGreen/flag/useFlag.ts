import { flagActions } from "@/app/realGreen/flag/flagSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useFlag({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
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
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      flagActions.getFlagDocs({
        params: {},
        config: {
          loadingMsg: "Loading flags...",
          force: true,
        },
      }),
    );

  return { refresh };
}
