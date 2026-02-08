import { progServActions } from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import { useCallback, useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { UnsavedServCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";

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

  const updateServCode = useCallback(
    (servCode: Partial<ServCodeDoc>) => {
      dispatch(progServActions.updateServCode(servCode));
    },
    [dispatch],
  );

  const saveServCodeChanges = useCallback(
    (unsavedChanges: UnsavedServCodeChanges[]) => {
      return dispatch(
        progServActions.saveServCodeChanges({
          params: { unsavedChanges },
          config: { force: true },
        }),
      );
    },
    [dispatch],
  );

  return { refresh, updateServCode, saveServCodeChanges };
}
