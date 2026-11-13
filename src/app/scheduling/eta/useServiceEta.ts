import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { serviceEtaActions } from "@/app/scheduling/eta/serviceEtaSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

type UseServiceEtaParams = {
  servIds: number[];
  /**
   * Comes from the component, because hooks expose actions only and do not select. Defaults to
   * allowed so callers that do not gate can omit it.
   */
  canLoad?: boolean;
};

export function useServiceEta({ servIds, canLoad = true }: UseServiceEtaParams) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!canLoad || servIds.length === 0) return;
    dispatch(
      serviceEtaActions.getServiceEtas({
        params: { servIds },
        config: {
          loadingMsg: "Loading ETAs",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [canLoad, dispatch, servIds]);
}

