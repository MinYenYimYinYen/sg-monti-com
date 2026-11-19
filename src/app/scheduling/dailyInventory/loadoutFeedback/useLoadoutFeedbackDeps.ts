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
  const { loadByServIds } = useByAssignmentCustomers();
  useCustomerContext({ contexts: ["byAssignment"] });
  useProduct({ autoLoad: true });
  useAppMethod({ autoLoad: true });
  useEquipment({ autoLoad: true });
  useEquipmentPackage({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useUnitConfig({ autoLoad: true });
  useEmployee({ autoLoad: true });

  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  useEffect(() => {
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
  }, [employeeId, routeDate, season, dispatch, showLoading]);

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
