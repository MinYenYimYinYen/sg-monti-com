import { progServActions } from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import { useCallback, useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ServCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgCodeDocProps } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import {
  UnsavedProgCodeChanges,
  UnsavedServCodeChanges,
} from "@/app/realGreen/progServ/_lib/types/ProgServState";

/** Which of the two loads this hook fires the caller may make. Absent means allowed, so write-only callers and callers in other folders can skip it. */
type CanLoad = {
  progCodes?: boolean;
  servCodes?: boolean;
};

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. A load
 * the user may not make is skipped, so a user holding one of the two reads gets no refused request
 * and no error toast.
 */
export function useProgServ({
  autoLoad = false,
  canLoad = {},
}: {
  autoLoad?: boolean;
  canLoad?: CanLoad;
}) {
  const { progCodes: canLoadProgCodes = true, servCodes: canLoadServCodes = true } = canLoad;
  const dispatch = useAppDispatch();

  const load = useCallback(
    ({ force = false }: { force?: boolean }) => {
      if (autoLoad) {
        if (canLoadProgCodes) {
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
        }
        if (canLoadServCodes) {
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
      }
    },
    [autoLoad, canLoadProgCodes, canLoadServCodes, dispatch],
  );

  useEffect(() => {
    if (autoLoad) load({});
  }, [autoLoad, load]);

  const refresh = () => load({ force: true });

  const updateServCode = useCallback(
    (servCode: Partial<ServCodeDocProps>) => {
      dispatch(progServActions.updateServCode(servCode));
    },
    [dispatch],
  );

  const saveServCodeChanges = useCallback(
    (unsavedChanges?: UnsavedServCodeChanges[]) => {
      return dispatch(
        progServActions.saveServCodeChanges({
          params: { unsavedChanges: unsavedChanges || [] },
          config: { force: true },
        }),
      );
    },
    [dispatch],
  );

  const updateProgCode = useCallback(
    (progCode: Partial<ProgCodeDocProps>) => {
      dispatch(progServActions.updateProgCode(progCode));
    },
    [dispatch],
  );

  const revertProgCode = useCallback(
    (progCodeId: string) => {
      dispatch(progServActions.revertProgCode({ progCodeId }));
    },
    [dispatch],
  );

  const saveProgCodeChanges = useCallback(
    (unsavedChanges: UnsavedProgCodeChanges[]) => {
      return dispatch(
        progServActions.saveProgCodeChanges({
          params: { unsavedChanges },
          config: { force: true },
        }),
      );
    },
    [dispatch],
  );

  return {
    refresh,
    updateServCode,
    saveServCodeChanges,
    updateProgCode,
    revertProgCode,
    saveProgCodeChanges,
  };
}
