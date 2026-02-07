import { useSelector } from "react-redux";
import { progServActions } from "@/app/realGreen/progServ/_lib/progServSlice";
import { useCallback, useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useAppDispatch } from "@/lib/hooks/redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";

export function useProgServ({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();
  const progCodesDocs = useSelector(progServSelect.progCodeDocs);

  const load = useCallback(
    ({ force = false }: { force?: boolean }) => {
      if (autoLoad) {
        dispatch(
          progServActions.getProgCodeDocs({
            // todo: getProgCodeDocs should also return ProgServs
            //  this way, we don't need the useEffect to trigger that.
            //  Modify the contract as such
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

  useEffect(() => {
    if (progCodesDocs.length > 0) {
      const progDefIds = progCodesDocs.map((p) => p.progDefId);
      dispatch(
        progServActions.getProgServs({
          params: { progDefIds },
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            loadingMsg: "Loading program/service code map...",
          },
        }),
      );
    }
  }, [dispatch, progCodesDocs]);

  return { refresh };
}
