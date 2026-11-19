import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useEffect, useState } from "react";
import {
  recentProductionGetDocs,
  recentProductionRefresh,
  recentProductionActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { ServiceCore } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

function buildRecentProductionPlan(season: number, dateRange: TRange<string>) {
  return new QueryBuilder()
    // Seed: completed services with doneDate within the date range
    .addServiceStep(["entity", "provider"], {
      stepName: "getServices",
      source: "values",
      filters: [
        { field: "season", operator: "eq", value: season },
        { field: "status", operator: "in", value: getServiceStatuses(["completed"]) },
        // productionCore.doneDate is a nested path — cast field to bypass keyof constraint
        { field: "productionCore.doneDate" as keyof ServiceCore, operator: "gte", value: dateRange.min },
        { field: "productionCore.doneDate" as keyof ServiceCore, operator: "lte", value: dateRange.max },
      ],
      provides: { progId: true },
    })
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getServices",
      joinKey: "progId",
      filters: [],
      provides: { custId: true },
    })
    .addCustomerStep(["entity"], {
      stepName: "getCustomers",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "custId",
      filters: [],
    })
    .build();
}

export function useRecentProduction(dateRange: TRange<string> | null) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const isValidDateRange = dateRanges.isValidDateRange(dateRange);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!season || !isValidDateRange || !dateRange) return;

    if (PIPELINE.recentProduction === "mirror") {
      const plan = buildRecentProductionPlan(season, dateRange);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(recentProductionGetDocs({ params: { plan } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(recentProductionGetDocs({ params: { schemeName: "recentProduction", season, schemeParams: { dateRange } } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    }
  }, [dateRange, dispatch, isValidDateRange, season]);

  const refresh = () => {
    if (!season || !isValidDateRange || !dateRange) return;

    if (PIPELINE.recentProduction === "mirror") {
      const plan = buildRecentProductionPlan(season, dateRange);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(recentProductionGetDocs({ params: { plan } as any, config: { force: true } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(recentProductionGetDocs({ params: { schemeName: "recentProduction", season, schemeParams: { dateRange } } as any, config: { force: true } as any }));
    }
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
