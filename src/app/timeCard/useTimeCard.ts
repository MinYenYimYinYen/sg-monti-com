"use client";

import { useAppDispatch } from "@/lib/hooks/redux";
import { timeCardActions } from "@/app/timeCard/timeCardSlice";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

type FetchPunchesParams = {
  dateRange?: TRange<string>;
  employeeIds?: string[];
};

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers in other folders (productivity, the import widget) can omit it.
 * Both fetches skip the request when it is false, so a user without the read gets no refused
 * request and no error toast.
 */
export function useTimeCard({ canLoad = true }: { canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  const fetchPunches = (params: FetchPunchesParams = {}) => {
    if (!canLoad) return;
    return dispatch(
      timeCardActions.getPunches({
        params,
        config: { loadingMsg: "Loading time cards..." },
      }),
    );
  };

  const fetchLastImportedDate = () => {
    if (!canLoad) return;
    return dispatch(
      timeCardActions.getLastImportedDate({
        params: {},
        config: {
          loadingMsg: "Loading last import date...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  };

  return { fetchPunches, fetchLastImportedDate };
}
