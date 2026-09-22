import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { callLogStatusActions } from "@/app/realGreen/callLog/callLogStatus/callLogStatusSlice";

export function useCallLogStatus() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      callLogStatusActions.getCallLogStatuses({
        params: {},
        config: { loadingMsg: "Loading call log statuses..." },
      }),
    );
  }, [dispatch]);
}
