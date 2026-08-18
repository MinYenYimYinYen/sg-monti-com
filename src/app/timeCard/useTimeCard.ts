"use client";

import { useAppDispatch } from "@/lib/hooks/redux";
import { timeCardActions } from "@/app/timeCard/timeCardSlice";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

type FetchPunchesParams = {
  dateRange?: TRange<string>;
  employeeIds?: string[];
};

export function useTimeCard() {
  const dispatch = useAppDispatch();

  const fetchPunches = (params: FetchPunchesParams = {}) =>
    dispatch(
      timeCardActions.getPunches({
        params,
        config: { loadingMsg: "Loading time cards..." },
      }),
    );

  const fetchLastImportedDate = () =>
    dispatch(
      timeCardActions.getLastImportedDate({
        params: {},
        config: {
          loadingMsg: "Loading last import date...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );

  return { fetchPunches, fetchLastImportedDate };
}
