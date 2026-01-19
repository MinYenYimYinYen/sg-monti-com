import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, AppState } from "@/store";
import {
  progServMetaActions,
} from "@/app/realGreen/progServMeta/progServMetaSlice";
import { useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";
import {progServMetaSelect} from "@/app/realGreen/progServMeta/selectors/progServMetaSelectors";

export function useProgServMeta({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const progCodesMongo = useSelector(progServMetaSelect.dryProgCodes);
  const servCodesMongo = useSelector(progServMetaSelect.dryServCodes);
  const progCodes = useSelector(progServMetaSelect.progCodes);
  const servCodes = useSelector(progServMetaSelect.servCodes);


  const load = ({ force = false }: { force?: boolean }) => {
    if (autoLoad) {
      dispatch(
        progServMetaActions.fetchDryProgCodes({
          params: {},
          config: {
            staleTime: realGreenConst.paramTypesCacheTime,
            loadingMsg: "Loading program codes...",
            force,
          },
        }),
      );
      dispatch(
        progServMetaActions.fetchDryServCodes({
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
      dispatch(
        progServMetaActions.fetchProgServs({
          params: { progDefIds: progCodesMongo.map((p) => p.progDefId) },
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
