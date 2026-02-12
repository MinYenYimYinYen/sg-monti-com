import { useSelector } from "react-redux";
import { useEffect } from "react";
import { lastSeasonProductionActions } from "@/app/realGreen/customer/slices/lastSeasonProductionSlice";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function useLastSeasonProduction({ autoLoad = false }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!autoLoad || !season) return;
    dispatch(
      lastSeasonProductionActions.getCustDocs({
        params: {
          schemeName: "lastSeasonProduction",
          season,
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      lastSeasonProductionActions.getCustDocs({
        params: {
          schemeName: "lastSeasonProduction",
          season,
        },
        config: {
          force: true,
        },
      }),
    );
  };

  return { refresh, canRefresh: !!season };
}
