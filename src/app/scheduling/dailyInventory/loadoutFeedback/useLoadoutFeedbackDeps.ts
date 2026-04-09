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
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useAppMethod } from "@/app/appMethod/useAppMethod";
import { useEquipment } from "@/app/equipment/useEquipment";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";

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
  useProduct({autoLoad: true})
  useAppMethod({autoLoad: true})
  useEquipment({autoLoad: true})
  useEquipmentPackage({autoLoad: true})
  useProgServ({autoLoad: true})
  useUnitConfig({autoLoad: true})
  useEmployee({autoLoad: true})

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
