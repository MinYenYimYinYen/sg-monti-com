import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { plannedTimeOffActions } from "@/app/plannedTimeOff/plannedTimeOffSlice";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";

export function usePlannedTimeOff({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        plannedTimeOffActions.getAll({
          params: {},
          config: { loadingMsg: "Loading time off..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

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
