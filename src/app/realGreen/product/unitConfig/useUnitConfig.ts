import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

import { ProductUnitConfig } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { unitConfigActions } from "@/app/realGreen/product/unitConfig/unitConfigSlice";

/**
 * `canLoad` comes from the component, because hooks expose actions only and do not select. It
 * defaults to allowed so write-only callers and callers in other folders can omit it.
 */
export function useUnitConfig({
  autoLoad,
  canLoad = true,
}: {
  autoLoad?: boolean;
  canLoad?: boolean;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad && canLoad) {
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
  }, [autoLoad, canLoad, dispatch]);

  const refresh = () => {
    if (!canLoad) return;
    dispatch(
      unitConfigActions.getAllUnitConfigs({
        params: {},
        config: {
          loadingMsg: "Refreshing unit conversions...",
          force: true,
        },
      }),
    );
  };

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

  return {
    refresh,
    saveConfig,
  };
}
