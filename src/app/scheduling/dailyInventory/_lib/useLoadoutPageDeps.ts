import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useEquipment } from "@/app/equipment/useEquipment";
import { assignmentActions } from "@/app/assignment/assignmentSlice";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { useByAssignmentCustomers } from "@/app/realGreen/customer/hooks/useByAssignmentCustomers";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { SchedulingCanLoad } from "@/app/scheduling/_libShared/schedulingCanLoad";

/**
 * `canLoad` comes from the page, because hooks expose actions only and do not select. Every hook
 * is still called on every render, in the same order: a flag only turns its load off.
 */
export function useLoadoutPageDeps({
  routeDate,
  canLoad,
}: {
  routeDate: string | null;
  canLoad: SchedulingCanLoad;
}) {
  const dispatch = useAppDispatch();
  const { loadByServIds } = useByAssignmentCustomers({ canLoad: canLoad.customers });

  useCustomerContext({ contexts: ["byAssignment"] });
  useEmployee({ autoLoad: true, canLoad: canLoad.employees });
  useEquipment({ autoLoad: true, canLoad: canLoad.equipment });
  useEquipmentPackage({ autoLoad: true, canLoad: canLoad.equipmentPackages });
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: canLoad.progCodes, servCodes: canLoad.servCodes },
  });
  useProduct({
    autoLoad: true,
    canLoad: {
      products: canLoad.products,
      unitConversions: canLoad.unitConversions,
      appMethods: canLoad.appMethods,
    },
  });
  useUnitConfig({ autoLoad: true, canLoad: canLoad.unitConversions });

  useGlobalSettings({ autoLoad: true, canLoad: canLoad.globalSettings });
  const season = useSelector(globalSettingsSelect.season);

  // Fetch available dates for the date picker on mount (once season is known)
  useEffect(() => {
    if (!canLoad.assignments || !season) return;
    dispatch(
      assignmentActions.getAvailableDates({
        params: { season },
        config: { staleTime: realGreenConst.paramTypesCacheTime },
      }),
    );
  }, [canLoad.assignments, dispatch, season]);

  // When routeDate changes, fetch all assignments for that date
  useEffect(() => {
    if (!canLoad.assignments || !routeDate || !season) return;
    dispatch(
      assignmentActions.getBySchedDate({
        params: { schedDate: routeDate },
        config: {
          loadingMsg: `Loading assignments for ${routeDate}...`,
          force: true,
        },
      }),
    );
  }, [canLoad.assignments, dispatch, routeDate, season]);

  // Once we have servIds for the date, fetch the full customer/service data
  const servIdsForDate = useSelector(assignmentSelect.servIdsForDate(routeDate ?? ""));
  useEffect(() => {
    if (!servIdsForDate.length || !season) return;
    loadByServIds(servIdsForDate, {
      loadingMsg: "Loading route services...",
      force: true,
    });
  }, [loadByServIds, servIdsForDate, season]);
}
