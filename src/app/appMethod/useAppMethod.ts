import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { appMethodActions } from "@/app/appMethod/appMethodSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import {
  AppMethod,
  AppMethodDoc,
} from "@/app/appMethod/AppMethodTypes";

/**
 * `canLoad` comes from the component (hooks expose actions only and do not select). When the user
 * may not read application methods the load is skipped, so no refused request or error toast.
 * Absent means allowed, so write-only callers can omit it.
 */
export function useAppMethod({ autoLoad, canLoad = true }: { autoLoad?: boolean; canLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
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
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      appMethodActions.getAll({
        params: {},
        config: { loadingMsg: "Refreshing appMethods...", force: true },
      }),
    );
  };

  const upsertAppMethod = (appMethod: AppMethodDoc) => {
    return dispatch(
      appMethodActions.upsert({
        params: { appMethod },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const deleteAppMethod = ({ appMethod, clearReferences }: { appMethod: AppMethod; clearReferences?: boolean }) => {
    return dispatch(
      appMethodActions.deleteOne({
        params: { appMethod, clearReferences },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const checkAppMethodDependencies = async (appMethodId: string) => {
    const result = await dispatch(
      appMethodActions.checkDependencies({
        params: { appMethodId },
        config: { showLoading: false, force: true },
      }),
    );
    if (appMethodActions.checkDependencies.fulfilled.match(result)) {
      return result.payload;
    }
    return null;
  };

  return { refresh, upsertAppMethod, deleteAppMethod, checkAppMethodDependencies };
}
