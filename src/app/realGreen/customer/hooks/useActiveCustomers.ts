import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  activeCustomersGetDocs,
  activeCustomersRefresh,
  activeCustomersActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { buildActiveCustomersPlan } from "@/app/realGreen/customer/hooks/buildActiveCustomersPlan";

/**
 * `canLoad` (the mirror read) and `canRefreshLive` (the live single-customer refresh) come from the
 * component, because hooks expose actions only and do not select. Both default to allowed so
 * callers that do not gate can omit them.
 */
export function useActiveCustomers({
  autoLoad = false,
  canLoad = true,
  canRefreshLive = true,
}: { autoLoad?: boolean; canLoad?: boolean; canRefreshLive?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoLoad || !canLoad || !season) return;

    if (PIPELINE.active === "mirror") {
      const plan = buildActiveCustomersPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(activeCustomersGetDocs({ params: { plan } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(activeCustomersGetDocs({ params: { schemeName: "activeCustomers", season } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    }
  }, [autoLoad, canLoad, dispatch, season]);

  const refresh = () => {
    if (!season || !canLoad) return;

    if (PIPELINE.active === "mirror") {
      const plan = buildActiveCustomersPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(activeCustomersGetDocs({ params: { plan } as any, config: { force: true } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(activeCustomersGetDocs({ params: { schemeName: "activeCustomers", season } as any, config: { force: true } as any }));
    }
  };

  const refreshCustomer = async (custId: number) => {
    if (!canRefreshLive || !season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        activeCustomersRefresh({
          params: { schemeName: "activeCustomers", season, custId },
          config: { showLoading: false },
        }),
      );
      if (activeCustomersRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(activeCustomersActions.removeCustomer(custId));
        } else {
          dispatch(activeCustomersActions.replaceCustomer(result.payload));
        }
      }
    } finally {
      setRefreshingCustIds((prev) => {
        const next = new Set(prev);
        next.delete(custId);
        return next;
      });
    }
  };

  const isRefreshingCustomer = (custId: number) => refreshingCustIds.has(custId);

  return { refresh, refreshCustomer, isRefreshingCustomer, canRefresh: !!season };
}
