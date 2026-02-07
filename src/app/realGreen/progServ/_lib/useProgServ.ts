import { progServActions } from "@/app/realGreen/progServ/_lib/progServSlice";
import { useCallback, useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useAppDispatch } from "@/lib/hooks/redux";

export function useProgServ({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  const load = useCallback(
    ({ force = false }: { force?: boolean }) => {
      if (autoLoad) {
        dispatch(
          progServActions.getProgCodeDocs({
            params: {},
            config: {
              staleTime: realGreenConst.paramTypesCacheTime,
              loadingMsg: "Loading program codes...",
              force,
            },
          }),
        );
        dispatch(
          progServActions.getServCodeDocs({
            params: {},
            config: {
              staleTime: realGreenConst.paramTypesCacheTime,
              loadingMsg: "Loading service codes...",
              force,
            },
          }),
        );
      }
    },
    [autoLoad, dispatch],
  );

  useEffect(() => {
    if (autoLoad) load({});
  }, [autoLoad, load]);

  const refresh = () => load({ force: true });
  return { refresh };
}
