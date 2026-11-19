import { useSelector } from "react-redux";
import { useEffect } from "react";
import { loadoutReportSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/report/loadoutReportSelect";
import { useRecentProduction } from "@/app/realGreen/customer/hooks/useRecentProduction";
import { useLoadout } from "@/app/loadout/useLoadout";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useAppMethod } from "@/app/appMethod/useAppMethod";
import { useEquipment } from "@/app/equipment/useEquipment";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";

export function useLoadoutReportDeps() {
  const dateRange = useSelector(loadoutReportSelect.dateRange);
  useCustomerContext({contexts: ["recentProduction"]})

  useGlobalSettings({ autoLoad: true });
  useProduct({ autoLoad: true });
  useAppMethod({ autoLoad: true });
  useEquipment({ autoLoad: true });
  useEquipmentPackage({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useUnitConfig({ autoLoad: true });
  useEmployee({ autoLoad: true });

  // Load completed services for the date range via recentProduction scheme
  useRecentProduction(dateRange);

  // Load all finished loadout docs for the date range
  const { getLoadouts } = useLoadout();
  useEffect(() => {
    if (!dateRanges.isValidDateRange(dateRange)) return;
    getLoadouts(dateRange);
  }, [dateRange, getLoadouts]);
}
