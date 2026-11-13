import { useSelector } from "react-redux";
import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  multiSeasonProductionGetDocs,
  multiSeasonProductionRefresh,
  multiSeasonProductionActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

function buildMultiSeasonProductionPlan(season: number) {
  return new QueryBuilder()
    // Seed: completed services across 4 prior seasons
    .addServiceStep(["entity", "provider"], {
      stepName: "getServices",
      source: "values",
      filters: [
        { field: "season", operator: "gte", value: season - 4 },
        { field: "season", operator: "lte", value: season - 1 },
        { field: "status", operator: "in", value: getServiceStatuses(["completed"]) },
      ],
      provides: { progId: true },
    })
    // Programs for those services
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getServices",
      joinKey: "progId",
      filters: [],
      provides: { custId: true },
    })
    // Customers for those programs
    .addCustomerStep(["entity"], {
      stepName: "getCustomers",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "custId",
      filters: [],
    })
    .build();
}

/**
 * `canLoad` (the mirror read) and `canRefreshLive` (the live single-customer refresh) come from the
 * component, because hooks expose actions only and do not select. Both default to allowed. The
 * returned `canLoad` also needs a season, so it is the AND of the two.
 */
export function useMultiSeasonProduction({
  canLoad: mayLoad = true,
  canRefreshLive = true,
}: { canLoad?: boolean; canRefreshLive?: boolean } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const season = useSelector(globalSettingsSelect.season);
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  const load = () => {
    if (!mayLoad || !season) return;

    if (PIPELINE.multiSeasonProduction === "mirror") {
      const plan = buildMultiSeasonProductionPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(multiSeasonProductionGetDocs({ params: { plan } as any, config: { loadingMsg: "Loading multi-season production data..." } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(multiSeasonProductionGetDocs({ params: { schemeName: "multiSeasonProduction", season } as any, config: { loadingMsg: "Loading multi-season production data..." } as any }));
    }
  };

  const refreshCustomer = async (custId: number) => {
    if (!canRefreshLive || !season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
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

  return { load, refreshCustomer, isRefreshingCustomer, canLoad: mayLoad && !!season };
}
