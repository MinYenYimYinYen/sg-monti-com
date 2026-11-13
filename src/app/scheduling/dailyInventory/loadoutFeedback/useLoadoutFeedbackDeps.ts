import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect } from "react";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useByAssignmentCustomers } from "@/app/realGreen/customer/hooks/useByAssignmentCustomers";
import { loadoutActions } from "@/app/loadout/loadoutSlice";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useAppMethod } from "@/app/appMethod/useAppMethod";
import { useEquipment } from "@/app/equipment/useEquipment";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { assignmentActions } from "@/app/assignment/assignmentSlice";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { SchedulingCanLoad } from "@/app/scheduling/_libShared/schedulingCanLoad";

/**
 * `canLoad` comes from the page, because hooks expose actions only and do not select. Every hook
 * is still called on every render, in the same order: a flag only turns its load off.
 */
export function useLoadoutFeedbackDeps({
  employeeId,
  routeDate,
  showLoading,
  canLoad,
}: {
  employeeId: string;
  routeDate: string;
  showLoading: boolean;
  canLoad: SchedulingCanLoad;
}) {
  const dispatch = useAppDispatch();
  const { loadByServIds } = useByAssignmentCustomers({ canLoad: canLoad.customers });
  useCustomerContext({ contexts: ["byAssignment"] });
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

  useGlobalSettings({ autoLoad: true, canLoad: canLoad.globalSettings });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
    if (!canLoad.assignments) return;
    if (!employeeId || !routeDate) return;
    if (!season) return;
    dispatch(
      assignmentActions.getBySchedDate({
        params: { schedDate: routeDate },
        config: {
          showLoading,
          loadingMsg: `Loading assignments for ${routeDate}...`,
          staleTime: 500,
        },
      }),
    );
  }, [canLoad.assignments, employeeId, routeDate, season, dispatch, showLoading]);

  const assignedServIds = useSelector(
    assignmentSelect.servIdsByEmployeeAndSchedDate(employeeId, routeDate),
  );

  useEffect(() => {
    if (!assignedServIds.length || !season) return;
    loadByServIds(assignedServIds, {
      loadingMsg: "Loading production data",
      showLoading,
      staleTime: 500,
    });
  }, [assignedServIds, loadByServIds, season, showLoading]);

  useEffect(() => {
    dispatch(
      loadoutActions.getLoadout({
        params: { employeeId, routeDate },
        config: {
          showLoading,
          loadingMsg: `Loading loadout for ${employeeId} on ${routeDate}...`,
        },
      }),
    );
  }, [dispatch, employeeId, routeDate, showLoading]);
}
