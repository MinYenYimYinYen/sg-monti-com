import { callAheadActions } from "@/app/realGreen/callAhead/callAheadSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useCallAhead({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        callAheadActions.getCallAheads({
          params: {
            showLoading: true,
            staleTime: realGreenConst.paramTypesCacheTime,
          },
          config: { loadingMsg: "Loading call aheads..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      callAheadActions.getCallAheads({
        params: {
          showLoading: true,
          force: true,
        },
        config: { loadingMsg: "Loading call aheads..." },
      }),
    );

  return { refresh };
}
