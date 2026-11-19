import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  fullSeasonServicesGetDocs,
  fullSeasonServicesRefresh,
  fullSeasonServicesActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";

function buildFullSeasonServicesPlan(season: number) {
  return new QueryBuilder()
    // Seed: all active customers (status "9")
    .addCustomerStep(["entity", "provider"], {
      stepName: "getCustomers",
      source: "values",
      filters: [{ field: "status", operator: "eq", value: "9" }],
      provides: { custId: true },
    })
    // Active programs for the current season
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getCustomers",
      joinKey: "custId",
      filters: [
        { field: "season", operator: "eq", value: season },
        { field: "status", operator: "eq", value: "9" },
      ],
      provides: { progId: true },
    })
    // All services for those programs (current season, all statuses)
    .addServiceStep(["entity"], {
      stepName: "getServices",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "progId",
      filters: [{ field: "season", operator: "eq", value: season }],
    })
    .build();
}

export function useFullSeasonServices({
  autoLoad = false,
  seasonOverride,
}: {
  autoLoad?: boolean;
  /** Override the season used for the query. Defaults to globalSettings.season. */
  seasonOverride?: number;
} = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const globalSeason = useSelector(globalSettingsSelect.season);
  const season = seasonOverride ?? globalSeason;
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoLoad || !season) return;

    if (PIPELINE.fullSeasonServices === "mirror") {
      const plan = buildFullSeasonServicesPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(fullSeasonServicesGetDocs({ params: { plan } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(fullSeasonServicesGetDocs({ params: { schemeName: "fullSeasonServices", season } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    }
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;

    if (PIPELINE.fullSeasonServices === "mirror") {
      const plan = buildFullSeasonServicesPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(fullSeasonServicesGetDocs({ params: { plan } as any, config: { force: true } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(fullSeasonServicesGetDocs({ params: { schemeName: "fullSeasonServices", season } as any, config: { force: true } as any }));
    }
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        fullSeasonServicesRefresh({
          params: { schemeName: "fullSeasonServices", season, custId },
          config: { showLoading: false },
        }),
      );
      if (fullSeasonServicesRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(fullSeasonServicesActions.removeCustomer(custId));
        } else {
          dispatch(fullSeasonServicesActions.replaceCustomer(result.payload));
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
