"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSeasonPlanActions } from "@/app/pace/seasonPlan/seasonPlanSlice";
import { SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers can omit it.
 */
export function usePaceSeasonPlan({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        paceSeasonPlanActions.getSeasonPlans({
          params: {},
          config: { loadingMsg: "Loading season plans..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const upsertSeasonPlan = (seasonPlan: SeasonPlan) =>
    dispatch(
      paceSeasonPlanActions.upsertSeasonPlan({
        params: seasonPlan,
        config: { force: true },
      }),
    );

  const deleteSeasonPlan = (name: string) =>
    dispatch(
      paceSeasonPlanActions.deleteSeasonPlan({
        params: { name },
        config: { force: true },
      }),
    );

  const activateSeasonPlan = (name: string) =>
    dispatch(
      paceSeasonPlanActions.activateSeasonPlan({
        params: { name },
        config: { force: true },
      }),
    );

  return { upsertSeasonPlan, deleteSeasonPlan, activateSeasonPlan };
}
