"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { timeCardActions } from "@/app/timeCard/timeCardSlice";
import { TRange } from "@/lib/primatives/tRange/TRange";

type UseTimeCardParams = {
  dateRange?: TRange<string>;
  employeeIds?: string[];
};

export function useTimeCard({ dateRange, employeeIds }: UseTimeCardParams = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      timeCardActions.getPunches({
        params: { dateRange, employeeIds },
        config: { loadingMsg: "Loading time cards..." },
      }),
    );
  }, [dispatch, dateRange, employeeIds]);
}
