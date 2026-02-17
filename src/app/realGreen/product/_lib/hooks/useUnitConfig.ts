import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

import { ProductUnitConfig } from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { unitConfigActions } from "@/app/realGreen/product/_lib/slices/unitConfigSlice";

export function useUnitConfig({ autoLoad }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        unitConfigActions.getAllUnitConfigs({
          params: {},
          config: {
            loadingMsg: "Loading unit conversions...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refresh = () =>
    dispatch(
      unitConfigActions.getAllUnitConfigs({
        params: {},
        config: {
          loadingMsg: "Refreshing unit conversions...",
          force: true,
        },
      }),
    );

  const saveConfig = (config: ProductUnitConfig) => {
    dispatch(unitConfigActions.updateConfig(config))

    return dispatch(
      unitConfigActions.saveUnitConfig({
        params: { config },
        config: {
          force: true,
          showLoading: false,
        },
      }),
    ).unwrap();

  };

  const deleteConfig = (productId: number) => {
    dispatch(unitConfigActions.removeConfig(productId))

    return dispatch(
      unitConfigActions.deleteUnitConfig({
        params: { productId },
        config: {
          force: true,
          showLoading: false,
        },
      }),
    ).unwrap();
  };

  return {
    refresh,
    saveConfig,
    deleteConfig,
  };
}
