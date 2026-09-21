import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { callLogActions } from "@/app/realGreen/callLog/callLogSlice";

/**
 * Hook for fetching call logs for a single customer directly from the RealGreen API.
 * Pass-through only — results are stored in Redux state but not persisted to Mongo.
 * For sync/persistence, see callLogSyncPlan.md.
 */
export function useCallLog({ custId }: { custId?: number } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (custId !== undefined) {
      dispatch(
        callLogActions.getCallLogsForCustomer({
          params: { custId },
          config: { loadingMsg: "Loading call logs..." },
        }),
      );
    }
  }, [dispatch, custId]);

  const refreshForCustomer = (refreshCustId: number) => {
    dispatch(
      callLogActions.getCallLogsForCustomer({
        params: { custId: refreshCustId },
        config: { loadingMsg: "Refreshing call logs...", force: true },
      }),
    );
  };

  return { refreshForCustomer };
}
