import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect } from "react";
import {
  byAssignmentActions,
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
import { assignmentActions } from "@/app/assignment/assignmentSlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { feedbackSelect } from "@/app/scheduling/dailyInventory/loadoutFeedback/feedbackSelect";

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
      assignmentActions.getByEmployeeIdAndSchedDate({
        params: { employeeId, schedDate: routeDate },
        config: {
          showLoading,
          loadingMsg: `Loading for ${employeeId} on ${routeDate}...`,
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [employeeId, routeDate, season, dispatch, showLoading]);

  const assignedServIds = useSelector(feedbackSelect.assignedServIds);
  useEffect(() => {
    if (!assignedServIds.length || !season) return;
    dispatch(
      byAssignmentActions.getDocs({
        params: {
          schemeName: "byServIds",
          season,
          schemeParams: { servIds: assignedServIds },
        },
        config: {
          loadingMsg: "Loading production data",
          showLoading,
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [assignedServIds, dispatch, season, showLoading]);

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
