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
import { byAssignmentActions } from "@/app/realGreen/customer/slices/customerSlices";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

/**
 * Loads all dependencies for the daily inventory page.
 *
 * Data strategy: uses the assignment-based approach (same as loadoutFeedback) instead of
 * the heavy printedCustomers stream. When a routeDate is selected:
 *   1. getBySchedDate → fetches all AssignmentDocs for that date (lightweight)
 *   2. byAssignmentActions.getDocs → fetches only the assigned services via byServIds scheme
 *
 * On mount: getAvailableDates → populates the date picker from the assignments collection.
 *
 * TODO: Evaluate whether useCustomerContext (and the "byAssignment" context) can be
 * eliminated in favour of a more direct selector approach that doesn't require the
 * central customer slice context machinery.
 */
export function useLoadoutDeps({ routeDate }: { routeDate: string | null }) {
  const dispatch = useAppDispatch();

  // TODO: Investigate removing useCustomerContext entirely — the byAssignment context
  // clears the central Maps on every fetch, which may be unnecessary overhead here.
  useCustomerContext({ contexts: ["byAssignment"] });

  useProgServ({ autoLoad: true });
  useUnitConfig({ autoLoad: true });
  useProduct({ autoLoad: true });
  useEmployee({ autoLoad: true });
  useEquipmentPackage({ autoLoad: true });
  useEquipment({ autoLoad: true });

  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);

  // Fetch available dates for the date picker on mount (once season is known)
  useEffect(() => {
    if (!season) return;
    dispatch(
      assignmentActions.getAvailableDates({
        params: { season },
        config: { staleTime: realGreenConst.paramTypesCacheTime },
      }),
    );
  }, [dispatch, season]);

  // When routeDate changes, fetch all assignments for that date
  useEffect(() => {
    if (!routeDate || !season) return;
    dispatch(
      assignmentActions.getBySchedDate({
        params: { schedDate: routeDate },
        config: {
          loadingMsg: `Loading assignments for ${routeDate}...`,
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch, routeDate, season]);

  // Once we have servIds for the date, fetch the full customer/service data
  const servIdsForDate = useSelector(assignmentSelect.servIdsForDate);
  useEffect(() => {
    if (!servIdsForDate.length || !season) return;
    dispatch(
      byAssignmentActions.getDocs({
        params: {
          schemeName: "byServIds",
          season,
          schemeParams: { servIds: servIdsForDate },
        },
        config: {
          loadingMsg: "Loading route services...",
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dispatch, servIdsForDate, season]);
}
