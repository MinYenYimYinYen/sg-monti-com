import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  callAheadActions,
  callAheadSelect,
} from "@/app/realGreen/callAhead/callAheadSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useCallAhead({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const callAheadMap = useSelector(callAheadSelect.callAheadMap);

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

  const findCallAhead = (id: number) => callAheadMap.get(id);
  const getCallAhead = (id: number) => {
    const callAhead = callAheadMap.get(id);
    if (!callAhead) {
      throw new AppError({
        message: "CallAhead not found",
        type: "VALIDATION_ERROR",
        isOperational: true,
        data: id,
      });
    }
    return callAhead;
  };

  return { refresh, findCallAhead, getCallAhead };
}
