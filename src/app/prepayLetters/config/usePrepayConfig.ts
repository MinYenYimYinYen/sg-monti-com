import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { prepayConfigActions } from "./prepayConfigSlice";
import type { PrepayConfigDoc } from "./prepayConfigTypes";

export function usePrepayConfig({ autoLoad }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        prepayConfigActions.getConfigs({
          params: {},
          config: { loadingMsg: "Loading prepay configs..." },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const saveConfig = (config: PrepayConfigDoc) =>
    dispatch(
      prepayConfigActions.saveConfig({
        params: { config },
        config: { loadingMsg: "Saving config...", force: true },
      }),
    );

  const deleteConfig = (configId: string) =>
    dispatch(
      prepayConfigActions.deleteConfig({
        params: { configId },
        config: { loadingMsg: "Deleting config...", force: true },
      }),
    );

  return {
    saveConfig,
    deleteConfig,
  };
}
