import { prepayActions } from "@/app/realGreen/prepay/prepaySlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function usePrepay({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
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
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      prepayActions.getPrepayCodes({
        params: {},
        config: {
          loadingMsg: "Loading prepay codes...",
          force: true,
        },
      }),
    );

  return { refresh };
}
