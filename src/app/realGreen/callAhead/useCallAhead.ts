import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import { callAheadActions } from "@/app/realGreen/callAhead/callAheadSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useCallAhead({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

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
