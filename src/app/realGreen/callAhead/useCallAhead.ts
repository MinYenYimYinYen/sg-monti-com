import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import {
  callAheadActions,
  callAheadSelect,
} from "@/app/realGreen/callAhead/callAheadSlice";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

export function useCallAhead({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const callAheadMap = useSelector(callAheadSelect.callAheadMap);

  if (autoLoad) {
    dispatch(
      callAheadActions.getCallAheads({
        showLoading: true,
        staleTime: realGreenConst.paramTypesCacheTime,
      }),
    );
  }

  const refresh = () =>
    dispatch(
      callAheadActions.getCallAheads({
        showLoading: true,
        force: true,
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
