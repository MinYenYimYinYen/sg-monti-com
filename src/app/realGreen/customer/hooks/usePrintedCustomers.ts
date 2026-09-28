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
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";

function buildPrintedCustomersPlan(season: number) {
  return new QueryBuilder()
    // Seed: printed services for the current season (most selective starting point)
    .addServiceStep(["provider"], {
      stepName: "getPrintedServices",
      source: "values",
      filters: [
        { field: "status", operator: "eq", value: "$" },
        { field: "season", operator: "eq", value: season },
      ],
      provides: { custId: true },
    })
    // Active customers who have a printed service
    .addCustomerStep(["entity", "provider"], {
      stepName: "getCustomers",
      source: "step",
      fromStep: "getPrintedServices",
      joinKey: "custId",
      filters: [{ field: "status", operator: "eq", value: "9" }],
      provides: { custId: true },
    })
    // Active programs for current season and prior season
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getCustomers",
      joinKey: "custId",
      filters: [
        { field: "season", operator: "gte", value: season - 1 },
        { field: "season", operator: "lte", value: season },
        { field: "status", operator: "eq", value: "9" },
      ],
      provides: { progId: true },
    })
    // All services for those programs (current season and prior season, all statuses)
    .addServiceStep(["entity"], {
      stepName: "getAllServices",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "progId",
      filters: [
        { field: "season", operator: "gte", value: season - 1 },
        { field: "season", operator: "lte", value: season },
      ],
    })
    .build();
}

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

    if (PIPELINE.printed === "mirror") {
      const plan = buildPrintedCustomersPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(printedCustomersGetDocs({ params: { plan } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(printedCustomersGetDocs({ params: { schemeName: "printedCustomers", season } as any, config: { staleTime: realGreenConst.paramTypesCacheTime } }));
    }
  }, [autoLoad, dispatch, season]);

  const refresh = () => {
    if (!season) return;

    if (PIPELINE.printed === "mirror") {
      const plan = buildPrintedCustomersPlan(season);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(printedCustomersGetDocs({ params: { plan } as any, config: { staleTime: realGreenConst.paramTypesCacheTime, force: true } as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(printedCustomersGetDocs({ params: { schemeName: "printedCustomers", season } as any, config: { staleTime: realGreenConst.paramTypesCacheTime, force: true } as any }));
    }
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        printedCustomersRefresh({
          params: { schemeName: "activeCustomers" as const, season, custId },
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
