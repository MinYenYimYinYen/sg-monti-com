"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { paceSeasonPlanActions } from "@/app/pace/seasonPlan/seasonPlanSlice";
import { SeasonPlan } from "@/app/pace/seasonPlan/SeasonPlanTypes";

export function usePaceSeasonPlan({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        paceSeasonPlanActions.getSeasonPlans({
          params: {},
          config: { loadingMsg: "Loading season plans..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

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
