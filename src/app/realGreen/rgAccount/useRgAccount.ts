import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { rgAccountActions } from "@/app/realGreen/rgAccount/rgAccountSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useRgAccount({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
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
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      rgAccountActions.getRgAccounts({
        params: {},
        config: {
          loadingMsg: "Loading RealGreen accounts...",
          force: true,
        },
      }),
    );

  return { refresh };
}
