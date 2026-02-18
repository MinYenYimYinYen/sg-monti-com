import { useAppDispatch, useAppSelector } from "@/lib/hooks/redux";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { useEffect } from "react";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useCustFlag({
  flagIds,
  custStatuses,
}: {
  flagIds: number[];
  custStatuses: string[];
}) {
  const dispatch = useAppDispatch();
  const flagIdsInState = useAppSelector(custFlagSelect.flagIdsInState);

  useEffect(() => {
    const flagsToLoad = flagIds.filter((id) => !flagIdsInState.includes(id));
    if (flagsToLoad.length) {
      dispatch(
        custFlagActions.loadFlagIdCustIds({
          params: {
            searches: flagsToLoad.map((id) => ({
              flagID: id,
              statuses: custStatuses,
            })),
          },
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            loadingMsg: "Loading customer flags...",
          },
        }),
      );
    }
  }, [custStatuses, dispatch, flagIds, flagIdsInState]);

  /**
   * Reloads custIds all flagIds.
   * Intention: After refreshing a customer (maybe added or removed a flag in SA5),
   * we want to reload all flagIds to get the latest data.
   * */
  const reloadFlagIds = () => {
    dispatch(
      custFlagActions.loadFlagIdCustIds({
        params: {
          searches: flagIds.map((id) => ({
            flagID: id,
            statuses: custStatuses,
          })),
        },
        config: {
          force: true,
          loadingMsg: "Loading customer flags...",
        },
      }),
    );
  };

  /**
   * Reloads custIds for a single flagId.
   * Intention: After assigning a specific flag to a customer,
   * or mass-assigning a flag to customers, we want to reload the
   * flagId to get the latest data.
   * */
  const reloadFlagId = (flagId: number) => {
    dispatch(
      custFlagActions.loadFlagIdCustIds({
        params: {
          searches: [{ flagID: flagId, statuses: custStatuses }],
        },
        config: { force: true },
      }),
    );
  };

  return { reloadFlagIds, reloadFlagId };
}
