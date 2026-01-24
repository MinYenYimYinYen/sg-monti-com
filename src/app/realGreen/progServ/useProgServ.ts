import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import { progServActions } from "@/app/realGreen/progServ/progServSlice";
import { useCallback, useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { progServSelect } from "@/app/realGreen/progServ/_selectors/progServSelectors";

export function useProgServ({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const progCodesMongo = useSelector(progServSelect.progCodes);

  const load = useCallback(({ force = false }: { force?: boolean }) => {
    if (autoLoad) {
      dispatch(
        progServActions.fetchDryProgCodes({
          params: {},
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            loadingMsg: "Loading program codes...",
            force,
          },
        }),
      );
      dispatch(
        progServActions.fetchDryServCodes({
          params: {},
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            loadingMsg: "Loading service codes...",
            force,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  useEffect(() => {
    if (autoLoad) load({});
  }, [autoLoad, load]);

  const refresh = () => load({ force: true });

  useEffect(() => {
    if (progCodesMongo.length > 0) {
      const progDefIds = progCodesMongo.map((p) => p.progDefId);
      dispatch(
        progServActions.fetchProgServs({
          params: { progDefIds },
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            loadingMsg: "Loading program/service code map...",
          },
        }),
      );
    }
  }, [dispatch, progCodesMongo]);

  return { refresh };
}
