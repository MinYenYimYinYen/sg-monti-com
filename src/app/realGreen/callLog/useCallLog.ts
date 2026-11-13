import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { callLogActions } from "@/app/realGreen/callLog/callLogSlice";

/**
 * Hook for fetching call logs for a single customer directly from the RealGreen API.
 * Pass-through only — results are stored in Redux state but not persisted to Mongo.
 * For sync/persistence, see callLog.readme.md.
 *
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers that do not gate can omit it.
 */
export function useCallLog({
  custId,
  canLoad = true,
}: { custId?: number; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (custId !== undefined && canLoad) {
      dispatch(
        callLogActions.getCallLogsForCustomer({
          params: { custId },
          config: { loadingMsg: "Loading call logs..." },
        }),
      );
    }
  }, [dispatch, custId, canLoad]);

  const refreshForCustomer = (refreshCustId: number) => {
    if (!canLoad) return;
    dispatch(
      callLogActions.getCallLogsForCustomer({
        params: { custId: refreshCustId },
        config: { loadingMsg: "Refreshing call logs...", force: true },
      }),
    );
  };

  return { refreshForCustomer };
}
