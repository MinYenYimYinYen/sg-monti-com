"use client";

import { useAppDispatch } from "@/lib/hooks/redux";
import { useState } from "react";
import {
  singleCustomerActions,
  singleCustomerRefresh,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { CustomerQueryPlan, QueryStep } from "@/app/realGreen/customer/mirror/CustomerQueryTypes";
import { CustomerCore } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgramCore } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ServiceCore } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// custId injection
//
// Prepends { field: "custId", operator: "eq", value: custId } to every step's
// filters. All three models (customer, program, service) have a custId field,
// so this scopes the entire plan to a single customer without the caller
// needing to know which steps need it.
//
// The caller's plan is the source of truth for structure (step order, season
// filters, provides, etc.). This function only guarantees custId scoping.
// ---------------------------------------------------------------------------

type AnyCore = CustomerCore | ProgramCore | ServiceCore;

function injectCustId(plan: CustomerQueryPlan, custId: number): CustomerQueryPlan {
  const custIdFilter = {
    field: "custId" as keyof AnyCore,
    operator: "eq" as const,
    value: custId,
  };

  return plan.map((step) => {
    const existingFilters = step.filters;
    const newFilters = Array.isArray(existingFilters)
      ? [custIdFilter, ...existingFilters]
      : [custIdFilter, existingFilters];

    return { ...step, filters: newFilters } as QueryStep;
  });
}

// ---------------------------------------------------------------------------
// useSingleCustomer
//
// Dispatches a customer query plan scoped to a single customer. The caller
// provides the plan template (including any season or other filters). This
// hook injects the custId filter into every step before dispatching.
//
// The single slice is cleared on each getDocs dispatch (pending extraReducer),
// so each lookup replaces the previous customer — no accumulation.
// ---------------------------------------------------------------------------

export function useSingleCustomer({ queryPlan }: { queryPlan: CustomerQueryPlan }) {
  const dispatch = useAppDispatch();
  const [refreshingCustIds, setRefreshingCustIds] = useState<Set<number>>(new Set());

  const lookup = (custId: number) => {
    if (!custId || custId < 0) return;

    if (PIPELINE.single === "mirror") {
      const plan = injectCustId(queryPlan, custId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(singleCustomerActions.getDocs({ params: { plan } as any, config: { showLoading: false, force: true } as any }));
    } else {
      // RealGreen pipeline callers must include season in their plan context.
      // The legacy path is kept for backward compatibility but is not used
      // when PIPELINE.single === "mirror".
      console.warn("[useSingleCustomer] RealGreen pipeline is not supported with the new queryPlan API.");
    }
  };

  const clearCustomer = (custId: number) => {
    dispatch(singleCustomerActions.removeCustomer(custId));
  };

  const refreshCustomer = async (custId: number) => {
    if (!custId || custId < 0 || refreshingCustIds.has(custId)) return;
    setRefreshingCustIds((prev) => new Set(prev).add(custId));
    try {
      // refreshCustomer still uses the legacy RealGreen scheme path.
      // This is intentional — refresh is a separate concern from initial lookup.
      const result = await dispatch(
        singleCustomerRefresh({
          params: { schemeName: "singleCustomer", season: 0, custId },
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
