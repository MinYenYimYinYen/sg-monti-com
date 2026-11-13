import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { holidayActions } from "@/app/holiday/holidaySlice";
import { Holiday } from "@/app/holiday/holidayTypes";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so callers in other folders can omit it.
 */
export function useHoliday({
  autoLoad,
  canLoad = true,
}: { autoLoad?: boolean; canLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
      dispatch(
        holidayActions.getAll({
          params: {},
          config: { loadingMsg: "Loading holidays..." },
        }),
      );
    }
  }, [autoLoad, canLoad, dispatch]);

  const upsert = (doc: Holiday) =>
    dispatch(
      holidayActions.upsert({
        params: { doc },
        config: { force: true },
      }),
    );

  const deleteOne = (holidayId: string) =>
    dispatch(
      holidayActions.deleteOne({
        params: { holidayId },
        config: { force: true },
      }),
    );

  return { upsert, deleteOne };
}
