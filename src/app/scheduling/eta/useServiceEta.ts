import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { serviceEtaActions } from "@/app/scheduling/eta/serviceEtaSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

type UseServiceEtaParams = { servIds: number[] };

export function useServiceEta({ servIds }: UseServiceEtaParams) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (servIds.length === 0) return;
    dispatch(
      serviceEtaActions.getServiceEtas({
        params: { servIds },
        config: {
          loadingMsg: "Loading ETAs",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch, servIds]);
}

