import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  lastSeasonProductionGetDocs,
  lastSeasonProductionRefresh,
  lastSeasonProductionActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

function buildLastSeasonProductionPlan(season: number) {
  return new QueryBuilder()
    // Seed: programs from last season (no status filter — matches original scheme)
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "values",
      filters: [{ field: "season", operator: "eq", value: season - 1 }],
      provides: { progId: true, custId: true },
    })
    // Completed services for those programs
    .addServiceStep(["entity", "provider"], {
      stepName: "getServices",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "progId",
      filters: [
        { field: "season", operator: "eq", value: season - 1 },
        { field: "status", operator: "in", value: getServiceStatuses(["completed"]) },
      ],
      provides: { custId: true },
    })
    // Customers for those services
    .addCustomerStep(["entity"], {
      stepName: "getCustomers",
      source: "step",
      fromStep: "getServices",
      joinKey: "custId",
      filters: [],
    })
    .build();
}

export function useLastSeasonProduction({ autoLoad = false }: { autoLoad?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!autoLoad || !season) return;

    if (PIPELINE.lastSeasonProduction === "mirror") {
      const plan = buildLastSeasonProductionPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(lastSeasonProductionGetDocs({ params: { plan } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(lastSeasonProductionGetDocs({ params: { schemeName: "lastSeasonProduction", season } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } as any }));
    }
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;

    if (PIPELINE.lastSeasonProduction === "mirror") {
      const plan = buildLastSeasonProductionPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(lastSeasonProductionGetDocs({ params: { plan } as any, config: { force: true } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(lastSeasonProductionGetDocs({ params: { schemeName: "lastSeasonProduction", season } as any, config: { force: true } as any }));
    }
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        lastSeasonProductionRefresh({
          params: { schemeName: "lastSeasonProduction", season, custId },
          config: { showLoading: false },
        }),
      );
      if (lastSeasonProductionRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(lastSeasonProductionActions.removeCustomer(custId));
        } else {
          dispatch(lastSeasonProductionActions.replaceCustomer(result.payload));
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
