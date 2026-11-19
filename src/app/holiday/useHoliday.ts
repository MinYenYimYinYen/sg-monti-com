import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { holidayActions } from "@/app/holiday/holidaySlice";
import { Holiday } from "@/app/holiday/holidayTypes";

export function useHoliday({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        holidayActions.getAll({
          params: {},
          config: { loadingMsg: "Loading holidays..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

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
