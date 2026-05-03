import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";

/**
 * Watches the global selectedFlagIds and loads custFlag data on demand
 * for any flags not yet in state. Call this from any feature that uses
 * the global flag filter (e.g., usePaceDeps).
 *
 * Uses custStatuses: ["9"] — active customers only.
 */
export function useSelectedCustFlags() {
  const dispatch = useAppDispatch();
  const selectedFlagIds = useSelector(custFlagSelect.selectedFlagIds);
  const flagIdsInState = useSelector(custFlagSelect.flagIdsInState);

  useEffect(() => {
    const flagsToLoad = selectedFlagIds.filter(
      (id) => !flagIdsInState.includes(id),
    );
    if (flagsToLoad.length === 0) return;
    dispatch(
      custFlagActions.loadFlagIdCustIds({
        params: {
          searches: flagsToLoad.map((id) => ({ flagID: id, statuses: ["9"] })),
        },
        config: { loadingMsg: "Loading customer flags..." },
      }),
    );
  }, [dispatch, selectedFlagIds, flagIdsInState]);
}
