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
