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
} from "@/app/realGreen/customer/slices/customerSlices";

export function useActiveCustomers({ autoLoad = false }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoLoad || !season) return;
    dispatch(
      activeCustomersGetDocs({
        params: {
          schemeName: "activeCustomers",
          season,
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      activeCustomersGetDocs({
        params: {
          schemeName: "activeCustomers",
          season,
        },
        config: {
          force: true,
        },
      }),
    );
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
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
