import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { globalSettingsActions } from "@/app/globalSettings/_lib/globalSettingsSlice";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * Ensures globalSettings is hydrated and loads custFlag data for all
 * configured renewal flag IDs on mount. Call this wherever renewal flag
 * data needs to be available (e.g., useNavBarDeps).
 */
export function useRenewalFlagIds() {
  const dispatch = useAppDispatch();
  const renewalFlagIds = useSelector(globalSettingsSelect.renewalFlagIds);
  const flagIdsInState = useSelector(custFlagSelect.flagIdsInState);

  // Hydrate globalSettings if not yet loaded
  useEffect(() => {
    dispatch(
      globalSettingsActions.getSettings({
        params: {},
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
          showLoading: false,
        },
      }),
    );
  }, [dispatch]);

  // Load custFlag data for any configured renewal flag IDs not yet in state
  useEffect(() => {
    const configuredIds = [
      renewalFlagIds.autoRenew,
      renewalFlagIds.dontAutoRenew,
      renewalFlagIds.confirmed,
    ].filter((id): id is number => id !== null);

    const flagsToLoad = configuredIds.filter((id) => !flagIdsInState.includes(id));
    if (flagsToLoad.length === 0) return;

    dispatch(
      custFlagActions.loadFlagIdCustIds({
        params: {
          searches: flagsToLoad.map((id) => ({ flagID: id, statuses: ["9"] })),
        },
        config: { loadingMsg: "Loading renewal flags..." },
      }),
    );
  }, [dispatch, renewalFlagIds, flagIdsInState]);

  return renewalFlagIds;
}
