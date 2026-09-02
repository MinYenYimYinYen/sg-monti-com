import { useSelector } from "react-redux";
import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  multiSeasonProductionGetDocs,
  multiSeasonProductionRefresh,
  multiSeasonProductionActions,
} from "@/app/realGreen/customer/slices/customerSlices";

export function useMultiSeasonProduction() {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  const load = () => {
    if (!season) return;
    dispatch(
      multiSeasonProductionGetDocs({
        params: {
          schemeName: "multiSeasonProduction",
          season,
        },
        config: {
          loadingMsg: "Loading multi-season production data...",
        },
      }),
    );
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        multiSeasonProductionRefresh({
          params: { schemeName: "multiSeasonProduction", season, custId },
          config: { showLoading: false },
        }),
      );
      if (multiSeasonProductionRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(multiSeasonProductionActions.removeCustomer(custId));
        } else {
          dispatch(multiSeasonProductionActions.replaceCustomer(result.payload));
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

  return { load, refreshCustomer, isRefreshingCustomer, canLoad: !!season };
}
