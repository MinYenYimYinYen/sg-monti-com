import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { flagActions } from "@/app/realGreen/flag/flagSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";

export function useFlag({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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
