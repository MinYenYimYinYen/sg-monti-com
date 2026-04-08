import { useAppDispatch } from "@/lib/hooks/redux";
import { LoadoutDoc } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { loadoutActions } from "@/app/scheduling/dailyInventory/_lib/loadoutSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { TRange } from "@/lib/primatives/tRange/TRange";

export function useLoadout() {
  const dispatch = useAppDispatch();

  return {
    upsertLoadout: async (loadout: LoadoutDoc): Promise<boolean> => {
      const result = await dispatch(
        loadoutActions.upsertLoadout({
          params: { loadout },
          config: { showLoading: false, force: true },
        }),
      );
      return loadoutActions.upsertLoadout.fulfilled.match(result);
    },
    getFinishFormLoadout: ({
      employeeId,
      routeDate,
    }: {
      employeeId: string;
      routeDate: string;
    }) =>
      dispatch(
        loadoutActions.getFinishFormLoadout({
          params: { employeeId, routeDate },
          config: {
            loadingMsg: "Getting loadout...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      ),
    getLoadouts: (dateRange: TRange<string>) =>
      dispatch(
        loadoutActions.getLoadouts({
          params: { dateRange },
          config: {
            loadingMsg: "Getting loadouts...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      ),
    getLoadout: ({
      employeeId,
      routeDate,
    }: {
      employeeId: string;
      routeDate: string;
    }) => {
      dispatch(
        loadoutActions.getLoadout({
          params: { employeeId, routeDate },
          config: {
            loadingMsg: "Getting loadout...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    },
  };
}
