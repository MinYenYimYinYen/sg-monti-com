import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/store";
import { progServActions } from "@/app/realGreen/progServ/progServSlice";
import { useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";
import { progServSelect } from "@/app/realGreen/progServ/selectors/progServSelectors";

export function useProgServ({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const progCodesMongo = useSelector(progServSelect.dryProgCodes);
  const servCodesMongo = useSelector(progServSelect.dryServCodes);
  const progCodes = useSelector(progServSelect.progCodes);
  const servCodes = useSelector(progServSelect.servCodes);

  const load = ({ force = false }: { force?: boolean }) => {
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
  };

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

  function findProgCode(progCodeId: string) {
    return progCodes.find((p) => p.progCodeId === progCodeId);
  }

  function findServCode(servCodeId: string) {
    return servCodes.find((s) => s.servCodeId === servCodeId);
  }

  function getProgCode(progCodeId: string) {
    const progCode = findProgCode(progCodeId);
    if (!progCode) {
      throw new AppError({ message: `Program code ${progCodeId} not found` });
    }
  }

  function getServCode(servCodeId: string) {
    const servCode = findServCode(servCodeId);
    if (!servCode) {
      throw new AppError({ message: `Service code ${servCodeId} not found` });
    }
  }

  return { refresh, findProgCode, findServCode, getProgCode, getServCode };
}
