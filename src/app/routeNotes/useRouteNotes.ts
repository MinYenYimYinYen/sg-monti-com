import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { routeNoteActions } from "@/app/routeNotes/routeNoteSlice";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";

type UseRouteNotesParams = {
  minDate: string;
  maxDate: string;
};

export function useRouteNotes({ minDate, maxDate }: UseRouteNotesParams) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!minDate || !maxDate) return;
    dispatch(
      routeNoteActions.getByDateRange({
        params: { minDate, maxDate },
        config: { loadingMsg: "Loading route notes..." },
      }),
    );
  }, [dispatch, minDate, maxDate]);

  const upsert = (doc: RouteNote) =>
    dispatch(
      routeNoteActions.upsert({
        params: { doc },
        config: { force: true },
      }),
    );

  const deleteOne = (routeNoteId: string) =>
    dispatch(
      routeNoteActions.deleteOne({
        params: { routeNoteId },
        config: { force: true },
      }),
    );

  return { upsert, deleteOne };
}
