import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { appMethodActions } from "@/app/realGreen/product/appMethod/appMethodSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import {
  AppMethod,
  AppMethodDoc,
} from "@/app/realGreen/product/appMethod/AppMethodTypes";

export function useAppMethod({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        appMethodActions.getAll({
          params: {},
          config: {
            loadingMsg: "Loading appMethods...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      appMethodActions.getAll({
        params: {},
        config: { loadingMsg: "Refreshing appMethods...", force: true },
      }),
    );

  const upsertAppMethod = (appMethod: AppMethodDoc) => {
    return dispatch(
      appMethodActions.upsert({
        params: { appMethod },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const deleteAppMethod = (appMethod: AppMethod) => {
    return dispatch(
      appMethodActions.deleteOne({
        params: { appMethod },
        config: { showLoading: false, force: true },
      }),
    );
  };

  return { refresh, upsertAppMethod, deleteAppMethod };
}
