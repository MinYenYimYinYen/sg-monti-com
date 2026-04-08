import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect } from "react";
import { recentProductionGetDocs } from "@/app/realGreen/customer/slices/customerSlices";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { TRange } from "@/lib/primatives/tRange/TRange";

export function useRecentProduction(dateRange: TRange<string>) {
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
          schemeParams: { dateRange: dateRange },
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dateRange, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      recentProductionGetDocs({
        params: {
          schemeName: "recentProduction",
          season,
          schemeParams: { dateRange: dateRange },
        },
        config: {
          force: true,
        },
      }),
    );
  };
  return { refresh, canRefresh: !!season };
}
