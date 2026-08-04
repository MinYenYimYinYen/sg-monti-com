"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priorityServiceActions } from "@/app/priorityService/priorityServiceSlice";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function usePriorityService({
  autoLoad,
}: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        priorityServiceActions.getAll({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const upsert = (doc: PriorityServiceDoc) =>
    dispatch(
      priorityServiceActions.upsert({
        params: { doc },
        config: { force: true },
      }),
    );

  const deleteOne = (servId: number) =>
    dispatch(
      priorityServiceActions.deleteOne({
        params: { servId },
        config: { force: true },
      }),
    );

  return { upsert, deleteOne };
}
