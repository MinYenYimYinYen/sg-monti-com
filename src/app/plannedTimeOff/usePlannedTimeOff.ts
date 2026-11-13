import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { plannedTimeOffActions } from "@/app/plannedTimeOff/plannedTimeOffSlice";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers in other folders can omit it.
 */
export function usePlannedTimeOff({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        plannedTimeOffActions.getAll({
          params: {},
          config: { loadingMsg: "Loading time off..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const upsert = (doc: PlannedTimeOff) =>
    dispatch(
      plannedTimeOffActions.upsert({
        params: { doc },
        config: { force: true },
      }),
    );

  const deleteOne = (plannedTimeOffId: string) =>
    dispatch(
      plannedTimeOffActions.deleteOne({
        params: { plannedTimeOffId },
        config: { force: true },
      }),
    );

  return { upsert, deleteOne };
}
