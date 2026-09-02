import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect, useState } from "react";
import {
  recentProductionGetDocs,
  recentProductionRefresh,
  recentProductionActions,
} from "@/app/realGreen/customer/slices/customerSlices";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";

export function useRecentProduction(dateRange: TRange<string> | null) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const isValidDateRange = dateRanges.isValidDateRange(dateRange);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!season || !isValidDateRange) return;
    dispatch(
      recentProductionGetDocs({
        params: {
          schemeName: "recentProduction",
          season,
          schemeParams: { dateRange: dateRange },
        },
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
        },
      }),
    );
  }, [dateRange, dispatch, isValidDateRange, season]);

  const refresh = () => {
    if (!season || !isValidDateRange) return;
    dispatch(
      recentProductionGetDocs({
        params: {
          schemeName: "recentProduction",
          season,
          schemeParams: { dateRange: dateRange },
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
        recentProductionRefresh({
          params: { schemeName: "recentProduction", season, custId },
          config: { showLoading: false },
        }),
      );
      if (recentProductionRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(recentProductionActions.removeCustomer(custId));
        } else {
          dispatch(recentProductionActions.replaceCustomer(result.payload));
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
