import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { upsellPrioritiesActions } from "./upsellPrioritiesSlice";
import type { UpsellPrioritiesDraft } from "./upsellPrioritiesTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers can omit it.
 */
export function useUpsellPriorities({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        upsellPrioritiesActions.getUpsellPriorities({
          params: {},
          config: { loadingMsg: "Loading upsell priorities..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

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
