import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { seasonPlanActions } from "@/app/bizPlan/seasonPlan/seasonPlanSlice";
import { SeasonPlan } from "@/app/bizPlan/seasonPlan/SeasonPlanTypes";

export function useSeasonPlan({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        seasonPlanActions.getSeasonPlans({
          params: {},
          config: { loadingMsg: "Loading season plans..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const upsertSeasonPlan = (seasonPlan: SeasonPlan) =>
    dispatch(
      seasonPlanActions.upsertSeasonPlan({
        params: seasonPlan,
        config: { force: true },
      }),
    );

  const deleteSeasonPlan = (name: string) =>
    dispatch(
      seasonPlanActions.deleteSeasonPlan({
        params: { name },
        config: { force: true },
      }),
    );

  const activateSeasonPlan = (name: string) =>
    dispatch(
      seasonPlanActions.activateSeasonPlan({
        params: { name },
        config: { force: true },
      }),
    );

  return { upsertSeasonPlan, deleteSeasonPlan, activateSeasonPlan };
}
