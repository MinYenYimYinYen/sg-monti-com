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
import { SchedulingCanLoad } from "@/app/scheduling/_libShared/schedulingCanLoad";

/**
 * `canLoad` comes from the page, because hooks expose actions only and do not select. Every hook
 * is still called on every render, in the same order: a flag only turns its load off.
 */
export function useLoadoutReportDeps({ canLoad }: { canLoad: SchedulingCanLoad }) {
  const dateRange = useSelector(loadoutReportSelect.dateRange);
  useCustomerContext({contexts: ["recentProduction"]})

  useGlobalSettings({ autoLoad: true, canLoad: canLoad.globalSettings });
  useProduct({
    autoLoad: true,
    canLoad: {
      products: canLoad.products,
      unitConversions: canLoad.unitConversions,
      appMethods: canLoad.appMethods,
    },
  });
  useAppMethod({ autoLoad: true, canLoad: canLoad.appMethods });
  useEquipment({ autoLoad: true, canLoad: canLoad.equipment });
  useEquipmentPackage({ autoLoad: true, canLoad: canLoad.equipmentPackages });
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: canLoad.progCodes, servCodes: canLoad.servCodes },
  });
  useUnitConfig({ autoLoad: true, canLoad: canLoad.unitConversions });
  useEmployee({ autoLoad: true, canLoad: canLoad.employees });

  // Load completed services for the date range via recentProduction scheme
  useRecentProduction(dateRange, { canLoad: canLoad.customers });

  // Load all finished loadout docs for the date range
  const { getLoadouts } = useLoadout();
  useEffect(() => {
    if (!dateRanges.isValidDateRange(dateRange)) return;
    getLoadouts(dateRange);
  }, [dateRange, getLoadouts]);
}
