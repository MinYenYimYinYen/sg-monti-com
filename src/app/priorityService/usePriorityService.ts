"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { priorityServiceActions } from "@/app/priorityService/priorityServiceSlice";
import { PriorityServiceDoc } from "@/app/priorityService/PriorityServiceTypes";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers in other folders can omit it.
 */
export function usePriorityService({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        priorityServiceActions.getAll({
          params: {},
          config: { staleTime: realGreenConst.paramTypesCacheTime },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

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
