import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { callLogReasonActions } from "@/app/realGreen/callLog/callLogReason/callLogReasonSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useCallLogReason() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      callLogReasonActions.getCallLogReasons({
        params: {},
        config: {
          loadingMsg: "Loading call log reasons...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch]);
}
