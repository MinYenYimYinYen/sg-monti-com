import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect } from "react";
import { recentProductionGetDocs } from "@/app/realGreen/customer/slices/customerReducers";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export function useRecentProduction() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!season) return;
    dispatch(
      recentProductionGetDocs({
        params: {
          schemeName: "recentProduction",
          season,
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      recentProductionGetDocs({
        params: {
          schemeName: "recentProduction",
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
