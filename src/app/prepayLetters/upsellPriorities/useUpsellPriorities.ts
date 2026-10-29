import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { upsellPrioritiesActions } from "./upsellPrioritiesSlice";
import type { UpsellPrioritiesDraft } from "./upsellPrioritiesTypes";

export function useUpsellPriorities({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        upsellPrioritiesActions.getUpsellPriorities({
          params: {},
          config: { loadingMsg: "Loading upsell priorities..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const saveUpsellPriorities = (upsellPriorities: UpsellPrioritiesDraft) =>
    dispatch(
      upsellPrioritiesActions.saveUpsellPriorities({
        params: { upsellPriorities },
        config: { loadingMsg: "Saving upsell priorities...", force: true },
      }),
    );

  const deleteUpsellPriorities = (upsellPrioritiesId: string) =>
    dispatch(
      upsellPrioritiesActions.deleteUpsellPriorities({
        params: { upsellPrioritiesId },
        config: { loadingMsg: "Deleting upsell priorities...", force: true },
      }),
    );

  return { saveUpsellPriorities, deleteUpsellPriorities };
}
