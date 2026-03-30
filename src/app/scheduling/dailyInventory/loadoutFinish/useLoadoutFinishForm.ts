import { useAppDispatch } from "@/lib/hooks/redux";
import { loadoutFinishActions } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSlice";

export function useLoadoutFinishForm() {
  const dispatch = useAppDispatch();

  const markFinishLoadoutFieldTouched = (fieldPath: string) => {
    dispatch(loadoutFinishActions.markFinishLoadoutFieldTouched(fieldPath));
  };

  const setShouldShowAllFinishLoadoutIssues = (show: boolean) => {
    dispatch(loadoutFinishActions.setShouldShowAllFinishLoadoutIssues(show));
  };

  const clearFinishLoadoutForm = () => {
    dispatch(loadoutFinishActions.clearFinishLoadoutForm());
  };

  return {
    markFinishLoadoutFieldTouched,
    setShouldShowAllFinishLoadoutIssues,
    clearFinishLoadoutForm,
  };
}
