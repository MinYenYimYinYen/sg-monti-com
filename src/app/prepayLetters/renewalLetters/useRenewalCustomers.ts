import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import {
  renewalCustomersGetDocs,
  renewalCustomersRefresh,
  renewalCustomersActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { renewalLettersActions } from "./renewalLettersSlice";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

// Flags are not part of the query: customers are grouped by renewal flag in selectors.
function buildRenewalCustomersPlan(season: number) {
  return new QueryBuilder()
    // Seed: active customers (status "9")
    .addCustomerStep(["entity", "provider"], {
      stepName: "getCustomers",
      source: "values",
      filters: [{ field: "status", operator: "eq", value: "9" }],
      provides: { custId: true },
    })
    // Active programs for the season
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
    // Services for the season, excluding skips and nevers
    .addServiceStep(["entity"], {
      stepName: "getServices",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "progId",
      filters: [
        { field: "season", operator: "eq", value: season },
        {
          field: "status",
          operator: "in",
          value: getServiceStatuses(["active", "asap", "printed", "completed"]),
        },
      ],
    })
    .build();
}

/**
 * Loads customers for renewal letters. Never auto-loads: a trigger calls `refreshCustomers`.
 * The season override exists because next season's services are created in the CRM before
 * globalSettings.season is advanced.
 */
export function useRenewalCustomers({ seasonOverride }: { seasonOverride?: number } = {}) {
  const dispatch = useAppDispatch();
  useGlobalSettings({ autoLoad: true });
  const globalSeason = useSelector(globalSettingsSelect.season);
  const season = seasonOverride ?? globalSeason;
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  const refreshCustomers = () => {
    if (!season) return;

    // The thunk clears the slice as it starts, so from here on the customers in state belong
    // to this season.
    dispatch(renewalLettersActions.setLoadedSeason(season));
    const config = { force: true, loadingMsg: "Loading renewal customers..." };
    if (PIPELINE.renewal === "mirror") {
      const plan = buildRenewalCustomersPlan(season);
      (dispatch as any)(renewalCustomersGetDocs({ params: { plan } as any, config: config as any }));
    } else {
      (dispatch as any)(renewalCustomersGetDocs({ params: { schemeName: "fullSeasonServices", season } as any, config: config as any }));
    }
  };

  const refreshCustomer = async (custId: number) => {
    if (!season || !custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      const result = await dispatch(
        renewalCustomersRefresh({
          params: { schemeName: "fullSeasonServices", season, custId },
          config: { showLoading: false },
        }),
      );
      if (renewalCustomersRefresh.fulfilled.match(result)) {
        if (result.payload.customerDocs.length === 0) {
          dispatch(renewalCustomersActions.removeCustomer(custId));
        } else {
          dispatch(renewalCustomersActions.replaceCustomer(result.payload));
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

  return { refreshCustomers, refreshCustomer, isRefreshingCustomer, canRefresh: !!season };
}
