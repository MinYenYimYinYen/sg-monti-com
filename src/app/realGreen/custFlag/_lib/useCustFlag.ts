import { useAppDispatch, } from "@/lib/hooks/redux";
import { custFlagSelect } from "@/app/realGreen/custFlag/_lib/custFlagSelect";
import { useEffect } from "react";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useSelector } from "react-redux";
import { CustFlagAdd } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";

export function useCustFlag({
  flagIds,
  custStatuses,
}: {
  flagIds: number[];
  custStatuses: string[];
}) {
  const dispatch = useAppDispatch();
  const flagIdsInState = useSelector(custFlagSelect.flagIdsInState);

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

  /**
   * Adds a flag to a single customer.
   * State is updated optimistically via addCustFlag.fulfilled in custFlagSlice.
   */
  const addFlag = (params: CustFlagAdd) => {
    return dispatch(
      custFlagActions.addCustFlag({
        params,
        config: { loadingMsg: "Assigning flag..." },
      }),
    );
  };

  /**
   * Adds flags to multiple customers, grouped by flagId.
   * Each CustFlagAdd entry represents one flagId with its list of custIds.
   * Dispatches one addCustFlag call per flagId with showLoading: false to
   * avoid multiple global spinner activations.
   */
  const addFlags = (assignments: CustFlagAdd[]) => {
    return Promise.all(
      assignments.map((params) =>
        dispatch(
          custFlagActions.addCustFlag({
            params,
            config: { showLoading: false },
          }),
        ),
      ),
    );
  };

  return { reloadFlagIds, reloadFlagId, addFlag, addFlags };
}
