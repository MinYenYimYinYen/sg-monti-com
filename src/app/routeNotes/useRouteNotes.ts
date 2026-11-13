import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { routeNoteActions } from "@/app/routeNotes/routeNoteSlice";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";

type UseRouteNotesParams = {
  minDate: string;
  maxDate: string;
  /**
   * Comes from the component, because hooks expose actions only and do not select. Defaults to
   * allowed so write-only callers can omit it.
   */
  canLoad?: boolean;
};

export function useRouteNotes({
  minDate,
  maxDate,
  canLoad = true,
}: UseRouteNotesParams) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!canLoad || !minDate || !maxDate) return;
    dispatch(
      routeNoteActions.getByDateRange({
        params: { minDate, maxDate },
        config: { loadingMsg: "Loading route notes..." },
      }),
    );
  }, [canLoad, dispatch, minDate, maxDate]);

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
