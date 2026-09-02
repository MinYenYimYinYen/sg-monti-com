import { realGreenConst } from "../../_lib/realGreenConst";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  printedCustomersGetDocs,
  printedCustomersRefresh,
  printedCustomersActions,
} from "@/app/realGreen/customer/slices/customerSlices";

export function usePrintedCustomers({
  autoLoad = false,
}: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoLoad || !season) {
      return;
    }
    dispatch(
      printedCustomersGetDocs({
        params: {
          schemeName: "printedCustomers",
          season,
        },
        config: { staleTime: realGreenConst.paramTypesCacheTime },
      }),
    );
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;
    dispatch(
      printedCustomersGetDocs({
        params: {
          schemeName: "printedCustomers",
          season,
        },
        config: { staleTime: realGreenConst.paramTypesCacheTime, force: true },
      }),
    );
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        printedCustomersRefresh({
          params: { schemeName: "printedCustomers", season, custId },
          config: { showLoading: false },
        }),
      );
      if (printedCustomersRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(printedCustomersActions.removeCustomer(custId));
        } else {
          dispatch(printedCustomersActions.replaceCustomer(result.payload));
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
