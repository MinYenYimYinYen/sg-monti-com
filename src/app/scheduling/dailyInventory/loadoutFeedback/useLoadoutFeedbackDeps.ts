import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect } from "react";
import {
  recentProductionActions,
} from "@/app/realGreen/customer/slices/customerSlices";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { loadoutActions } from "@/app/scheduling/dailyInventory/_lib/loadoutSlice";

export function useLoadoutFeedbackDeps({
  employeeId,
  routeDate,
  showLoading,
}: {
  employeeId: string;
  routeDate: string;
  showLoading: boolean;
}) {
  const dispatch = useAppDispatch();
  useCustomerContext({ contexts: ["recentProduction"] });

  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!season) return;
    dispatch(
      recentProductionActions.getDocs({
        params: {
          schemeName: "recentProduction",
          season,
          schemeParams: {
            dateRange: { min: routeDate, max: dateStrings.addDays(routeDate, 5) },
          },
        },
        config: {
          force: true,
          loadingMsg: "Loading production data",
          showLoading,
        },
      }),
    );
    dispatch(
      loadoutActions.getLoadout({
        params: {employeeId, routeDate},
        config: {
          showLoading,
          loadingMsg: `Loading loadout for ${employeeId} on ${routeDate}...`
        }
      })
    )
  }, [dispatch, employeeId, routeDate, season, showLoading]);
}
