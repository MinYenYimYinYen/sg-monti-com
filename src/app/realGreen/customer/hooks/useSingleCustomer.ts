import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useState } from "react";
import {
  singleCustomerActions,
  singleCustomerRefresh,
} from "@/app/realGreen/customer/slices/customerSlices";

export function useSingleCustomer() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const { season } = useSelector(globalSettingsSelect.settings);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  const lookup = (custId: number) => {
    if (!season) return;
    if (!custId || custId < 0) return;
    dispatch(
      singleCustomerActions.getDocs({
        params: {
          schemeName: "singleCustomer",
          season,
          schemeParams: { custId },
        },
        config: { showLoading: false, force: true },
      }),
    );
  };

  const clearCustomer = (custId: number) => {
    dispatch(singleCustomerActions.removeCustomer(custId));
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        singleCustomerRefresh({
          params: { schemeName: "singleCustomer", season, custId },
          config: { showLoading: false },
        }),
      );
      if (singleCustomerRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(singleCustomerActions.removeCustomer(custId));
        } else {
          dispatch(singleCustomerActions.replaceCustomer(result.payload));
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

  return { lookup, clearCustomer, refreshCustomer, isRefreshingCustomer };
}
